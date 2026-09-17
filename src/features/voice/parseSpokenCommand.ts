import type { Exercise } from "../../domain/programme";

export interface SpokenPrescription {
  exercise: Exercise;
  sets?: string;
  reps?: string;
  duration?: string;
  durationUnit?: "sec" | "min";
  rest?: string;
  frequency?: string;
  side?: "Left" | "Right" | "Both";
  matchScore?: number;
  heard?: string;
}

export interface SpokenParseResult {
  items: SpokenPrescription[];
  unmatched: string[];
  transcript: string;
}

export interface ExerciseMatch {
  exercise: Exercise;
  score: number;
}

interface WindowMatch extends ExerciseMatch {
  start: number;
  end: number;
  heard: string;
}

const numberWords: Record<string, number> = {
  en: 1,
  ett: 1,
  ein: 1,
  to: 2,
  tre: 3,
  fire: 4,
  fem: 5,
  seks: 6,
  sju: 7,
  syv: 7,
  åtte: 8,
  ni: 9,
  ti: 10,
  elleve: 11,
  tolv: 12,
  tretten: 13,
  fjorten: 14,
  femten: 15,
  seksten: 16,
  sytten: 17,
  atten: 18,
  nitten: 19,
  tjue: 20,
  tretti: 30,
  førti: 40,
  femti: 50,
  seksti: 60,
};

const stopWords = new Set([
  "og",
  "men",
  "jeg",
  "vi",
  "du",
  "de",
  "dem",
  "den",
  "det",
  "er",
  "har",
  "skal",
  "kan",
  "vil",
  "trenger",
  "treng",
  "ma",
  "må",
  "bare",
  "litt",
  "noe",
  "liksom",
  "altså",
  "ok",
  "okei",
  "greit",
  "hva",
  "som",
  "for",
  "til",
  "med",
  "på",
  "mot",
  "ved",
  "nær",
  "fra",
  "i",
  "av",
  "å",
  "apparat",
  "apparatet",
  "maskin",
  "maskinen",
  "øvelse",
  "øvelsen",
]);

const allMarkerWords = [
  "alle",
  "all",
  "øvelsene",
  "mellom settene",
  "mellom setta",
  "mellom set",
];

const letterClass = "a-zæøå0-9";
const dosageWordList =
  "reps?|rep|repetisjon\\w*|gjentakel\\w*|sett|settene|setta|settet|set|sets|ganger|gang|eks|kryss|x|pause\\w*|hvile|kvil\\w*|rest|sek\\w*|sec|min\\w*|minutt\\w*|kilo|kg|dag\\w*|annenhver|uke\\w*|per|venstre|høyre|hoyre|begge";
const dosageWords = new RegExp(
  `(?:^|[^${letterClass}])(?:${dosageWordList})(?=$|[^${letterClass}])`,
  "gi",
);

function containsWord(text: string, words: string[]): boolean {
  return words.some((word) =>
    new RegExp(
      `(?:^|[^${letterClass}])${word}(?=$|[^${letterClass}])`,
      "i",
    ).test(text),
  );
}

const maxWindow = 6;

const defaultAliases: Record<string, string[]> = {
  "shoulder-press": ["skulderpress", "skulderpressen"],
  "bench-press": ["benkpress", "benk press"],
  "incline-press": ["skråbenk", "skrabenk"],
  deadlift: ["markløft", "markloft"],
  squat: ["knebøy", "kneboy"],
  "half-squat": ["halv knebøy", "halv kneboy"],
  "toe-lift": ["tåhev", "tahev"],
  "bicep-curl": ["bicepscurl", "biceps curl"],
};

export function parseSpokenCommand(
  transcript: string,
  exercises: Exercise[],
): SpokenParseResult {
  const words = normalize(transcript)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => replaceNumberWords(word));
  const accepted = resolveMatches(findMatches(words, exercises));
  const items: SpokenPrescription[] = accepted.map((match) => ({
    exercise: match.exercise,
    matchScore: match.score,
    heard: match.heard,
  }));
  const unmatched: string[] = [];

  accepted.forEach((match, index) => {
    const previousEnd = index === 0 ? 0 : accepted[index - 1].end;
    const chunk = words.slice(previousEnd, match.start).join(" ").trim();
    if (!chunk) return;
    const { values } = parseDosage(chunk);
    const target = index === 0 ? match : accepted[index - 1];
    const indexes = indexesFor(
      containsWord(chunk, allMarkerWords) ? items : [target],
    );
    if (Object.keys(values).length) {
      for (const itemIndex of indexes) Object.assign(items[itemIndex], values);
      return;
    }
    if (meaningful(chunk)) unmatched.push(chunk);
  });

  const tail = words
    .slice(accepted.length ? accepted[accepted.length - 1].end : 0)
    .join(" ")
    .trim();
  if (tail) {
    const { values } = parseDosage(tail);
    const spread =
      !items.length ||
      containsWord(tail, allMarkerWords) ||
      containsWord(tail, ["pause", "pauser", "hvile", "rest"]);
    if (Object.keys(values).length) {
      const targets = spread ? items : [items[items.length - 1]];
      if (!targets.length) unmatched.push(tail);
      for (const item of targets) Object.assign(item, values);
    } else if (meaningful(tail)) {
      unmatched.push(tail);
    }
  }

  return { items, unmatched, transcript };

  function indexesFor(targets: SpokenPrescription[]): number[] {
    return targets
      .map((target) => items.indexOf(target))
      .filter((itemIndex) => itemIndex >= 0);
  }
}

function meaningful(text: string): boolean {
  return tokens(text).length >= 2;
}

function findMatches(words: string[], exercises: Exercise[]): WindowMatch[] {
  const matches: WindowMatch[] = [];
  for (let start = 0; start < words.length; start += 1) {
    for (
      let length = 1;
      length <= maxWindow && start + length <= words.length;
      length += 1
    ) {
      const heard = words.slice(start, start + length).join(" ");
      const trimmed = trimWindow(heard);
      if (!fold(trimmed) || tokens(trimmed).length === 0) continue;
      if (tokens(stripDosage(heard)).length === 0) continue;
      const ranked = rankExercises(trimmed, exercises);
      const best = ranked[0];
      if (!best) continue;
      const runnerUp = ranked[1]?.score ?? 0;
      const ambiguous = best.score - runnerUp < 0.05;
      const threshold = length === 1 ? 0.72 : 0.62;
      const score = best.score - dosagePenalty(trimmed, best.exercise);
      if (score < threshold) continue;
      matches.push({
        ...best,
        score: ambiguous ? score * 0.85 : score,
        start,
        end: start + length,
        heard: trimmed,
      });
    }
  }
  return matches;
}

function trimWindow(heard: string): string {
  const parts = heard.split(/\s+/);
  while (parts.length && isFiller(parts[0])) parts.shift();
  while (parts.length && isFiller(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

function isFiller(word: string): boolean {
  return (
    stopWords.has(word) ||
    /^(?:og|men|jeg|vi|du|de|den|det|er|har|skal|kan|vil|trenger|treng|så|bare|liksom|altså|ok|okei|greit)$/.test(
      word,
    )
  );
}

function dosagePenalty(heard: string, exercise: Exercise): number {
  const dosageWord =
    containsWord(heard, [
      "sett",
      "settene",
      "set",
      "reps",
      "rep",
      "ganger",
      "pause",
      "sek",
      "sekunder",
      "min",
      "minutter",
      "eks",
      "kryss",
      "x",
      "venstre",
      "høyre",
      "hoyre",
      "begge",
    ]) || heard.includes(" x ");
  const spokenDigits: string[] = heard.match(/\d+/g) || [];
  const nameDigits: string[] = exercise.name.match(/\d+/g) || [];
  const strayDigit = spokenDigits.some((digit) => !nameDigits.includes(digit));
  return dosageWord || strayDigit ? 0.25 : 0;
}

function resolveMatches(matches: WindowMatch[]): WindowMatch[] {
  const accepted: WindowMatch[] = [];
  const ordered = [...matches].sort((a, b) => {
    if (Math.abs(a.score - b.score) >= 0.03) return b.score - a.score;
    return b.end - b.start - (a.end - a.start) || a.start - b.start;
  });
  for (const match of ordered) {
    const overlaps = accepted.some(
      (existing) => match.start < existing.end && existing.start < match.end,
    );
    if (!overlaps) accepted.push(match);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zæøå0-9-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Norwegian sound-alike folding, so slips from speech recognition still match:
 * bein/ben, aa/å, æ/e, ø/o, kj/tj/gj/hj, skj/sj, hv/v and doubled letters.
 */
export function fold(text: string): string {
  return normalize(text)
    .replace(/aa/g, "å")
    .replace(/æ/g, "e")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/skj/g, "sj")
    .replace(/kj/g, "k")
    .replace(/tj/g, "t")
    .replace(/gj/g, "g")
    .replace(/hj/g, "j")
    .replace(/hv/g, "v")
    .replace(/ei/g, "e")
    .replace(/([a-z0-9])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceNumberWords(text: string): string {
  return text.replace(/\b[a-zæøå]+\b/g, (word) => {
    const value = numberWords[word];
    return value === undefined ? word : String(value);
  });
}

export function stripDosage(text: string): string {
  return normalize(text)
    .replace(/\d+/g, " ")
    .replace(dosageWords, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return fold(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function compact(text: string): string {
  return fold(text).replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const columns = b.length + 1;
  let previous = Array.from({ length: columns }, (_, index) => index);
  for (let row = 1; row < rows; row += 1) {
    const current = [row];
    for (let column = 1; column < columns; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[columns - 1];
}

function similarity(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return (
    short.length >= 4 &&
    short.length >= long.length * 0.65 &&
    long.startsWith(short)
  );
}

function candidates(exercise: Exercise): { text: string; weight: number }[] {
  const aliases = (exercise as Exercise & { aliases?: string[] }).aliases || [];
  return [
    { text: exercise.name, weight: 1 },
    { text: exercise.id.replace(/-/g, " "), weight: 1 },
    { text: exercise.name.replace(/\s+i\s+apparat(et)?$/i, ""), weight: 1 },
    ...aliases.map((alias) => ({ text: alias, weight: 1 })),
    ...(defaultAliases[exercise.id] || []).map((alias) => ({
      text: alias,
      weight: 1,
    })),
    ...(exercise.tags || []).map((tag) => ({ text: tag, weight: 0.82 })),
  ].filter((candidate) => candidate.text && !/^form$/i.test(candidate.text));
}

export function scoreExercise(segment: string, exercise: Exercise): number {
  const query = fold(segment);
  const queryTokens = tokens(segment);
  if (!query || !queryTokens.length) return 0;
  const queryCompact = compact(segment);
  let best = 0;
  for (const candidate of candidates(exercise)) {
    const target = fold(candidate.text);
    if (!target) continue;
    const targetTokens = tokens(candidate.text);
    const targetCompact = compact(candidate.text);
    let score = 0;
    if (target === query) score = 1;
    else if (targetCompact === queryCompact) score = 0.99;
    else if (target.startsWith(`${query} `) || query.startsWith(`${target} `))
      score = 0.95;
    else if (
      (targetCompact.includes(queryCompact) ||
        queryCompact.includes(targetCompact)) &&
      Math.min(targetCompact.length, queryCompact.length) >=
        Math.max(targetCompact.length, queryCompact.length) * 0.45
    )
      score = 0.9;
    if (queryTokens.length) {
      const matched = queryTokens.filter((queryToken) =>
        targetTokens.some((targetToken) =>
          tokenMatches(queryToken, targetToken),
        ),
      ).length;
      score = Math.max(score, matched / queryTokens.length);
    }
    score = Math.max(score, similarity(queryCompact, targetCompact) * 0.96);
    if (targetTokens.length)
      score += 0.02 / (1 + Math.abs(targetTokens.length - queryTokens.length));
    best = Math.max(best, score * candidate.weight);
  }
  return best;
}

export function rankExercises(
  segment: string,
  exercises: Exercise[],
): ExerciseMatch[] {
  return exercises
    .map((exercise) => ({
      exercise,
      score: scoreExercise(segment, exercise),
    }))
    .sort((a, b) => b.score - a.score);
}

export function matchExercise(
  segment: string,
  exercises: Exercise[],
): ExerciseMatch | null {
  if (!fold(segment)) return null;
  const ranked = rankExercises(segment, exercises);
  const best = ranked[0];
  if (!best) return null;
  const runnerUp = ranked[1]?.score ?? 0;
  if (best.score >= 0.62) return best;
  if (best.score >= 0.5 && best.score - runnerUp >= 0.12) return best;
  return null;
}

function parseDosage(segment: string): {
  values: Partial<
    Pick<
      SpokenPrescription,
      | "sets"
      | "reps"
      | "duration"
      | "durationUnit"
      | "rest"
      | "frequency"
      | "side"
    >
  >;
} {
  const text = replaceNumberWords(normalize(segment));
  const values: ReturnType<typeof parseDosage>["values"] = {};
  const unit = (value: string): "sec" | "min" =>
    /^m/.test(value) ? "min" : "sec";
  const separator = "(?:x|eks|kryss|ganger)";
  const setWord = "(?:sett|settene|setta|settet|sets|set)";
  const repWord = "(?:reps?|rep|repetisjon\\w*|gjentakel\\w*|ganger)";
  const timeWord = "(?:sek\\w*|sec|minutt\\w*|min\\w*)";
  const restWord = "(?:pause\\w*|hvile|kvil\\w*|rest)";

  const rest =
    text.match(
      new RegExp(`${restWord}\\s*(?:på\\s*)?(\\d+)\\s*(${timeWord})`, "i"),
    ) || text.match(new RegExp(`(\\d+)\\s*(${timeWord})\\s*${restWord}`, "i"));
  if (rest) {
    const amount = Number(rest[1]);
    values.rest = String(unit(rest[2]) === "min" ? amount * 60 : amount);
  }

  const paired = text.match(
    new RegExp(
      `(\\d+)\\s*${separator}\\s*(\\d+)(?:\\s*(?:-|til)\\s*(\\d+))?\\s*(${repWord}|${timeWord})?`,
      "i",
    ),
  );
  if (paired) {
    values.sets = String(Number(paired[1]));
    const kind = paired[4] || "";
    if (kind && /^(m|sec|s)/.test(kind)) {
      values.duration = String(Number(paired[2]));
      values.durationUnit = unit(kind);
    } else {
      values.reps = paired[3]
        ? `${Number(paired[2])}–${Number(paired[3])}`
        : String(Number(paired[2]));
    }
  }

  if (!values.sets) {
    const sets = text.match(new RegExp(`(\\d+)\\s*${setWord}`, "i"));
    if (sets) values.sets = String(Number(sets[1]));
  }

  if (!values.reps && !values.duration) {
    const reps = text.match(
      new RegExp(`(\\d+)(?:\\s*(?:-|til)\\s*(\\d+))?\\s*${repWord}`, "i"),
    );
    if (reps)
      values.reps = reps[2]
        ? `${Number(reps[1])}–${Number(reps[2])}`
        : String(Number(reps[1]));
  }

  if (!values.duration && !values.rest) {
    const seconds = text.match(new RegExp(`(\\d+)\\s*(${timeWord})`, "i"));
    if (seconds) {
      values.duration = String(Number(seconds[1]));
      values.durationUnit = unit(seconds[2]);
    }
  }

  const frequency = text.match(
    /(annenhver dag|hver dag|daglig|\d+\s*ganger?\s*(?:i|per)\s*uken?|\d+\s*ganger?\s*daglig)/i,
  );
  if (frequency) values.frequency = frequency[0].trim();

  if (containsWord(text, ["venstre"])) values.side = "Left";
  else if (containsWord(text, ["høyre", "hoyre"])) values.side = "Right";
  else if (containsWord(text, ["begge"])) values.side = "Both";

  return { values };
}
