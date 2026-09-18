import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, openAiKey, rootDir } from "./config.mjs";

/**
 * Norske øvelsesnavn sendes som «keywords» til gpt-transcribe, som er den
 * offisielle måten å gi modellen fagord den ellers gjetter på.
 */
function catalogueKeywords() {
  const names = new Set();
  for (const file of [
    "src/data/generated-exercises.json",
    "src/data/exercises.json",
  ]) {
    try {
      const entries = JSON.parse(readFileSync(resolve(rootDir, file), "utf8"));
      for (const entry of entries) {
        if (entry.name) names.add(entry.name);
        for (const tag of entry.tags || []) {
          if (tag.length > 2 && tag.length < 40) names.add(tag);
        }
      }
    } catch {
      /* katalogen er valgfri; transkriberingen virker uten */
    }
  }
  return [...names].slice(0, 120);
}

const keywords = catalogueKeywords();
const prompt =
  "Norsk fysioterapi. Programmering av øvelser med sett, repetisjoner og pauser. Eksempel: brystpress, nedtrekk, beinpress, flyttes 3 sett og 10 reps, 2 min pause.";

export function transcriptionReady() {
  return Boolean(openAiKey());
}

export function transcriptionModel() {
  return config.transcriptionModel;
}

export async function transcribeAudio(bytes, contentType) {
  const key = openAiKey();
  if (!key) {
    const error = new Error(
      "Ingen OPENAI_API_KEY funnet. Legg den i .env.openai på serveren.",
    );
    error.status = 501;
    throw error;
  }
  if (!bytes.length) {
    const error = new Error("Tomt lydopptak.");
    error.status = 400;
    throw error;
  }
  if (bytes.length > config.maxAudioBytes) {
    const error = new Error(
      `Opptaket er større enn ${Math.round(config.maxAudioBytes / 1024 / 1024)} MB.`,
    );
    error.status = 413;
    throw error;
  }

  const form = new FormData();
  form.append("model", transcriptionModel());
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], {
      type: contentType || "audio/webm",
    }),
    "tale.webm",
  );
  form.append("prompt", prompt);
  form.append("language", "no");
  // Offisiell dokumentasjon viser «keywords» som liste; i multipart sendes
  // lister som gjentatte felt med samme navn.
  for (const keyword of keywords) form.append("keywords", keyword);

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error?.message || "Transkriberingen feilet.",
    );
    error.status = response.status;
    throw error;
  }
  return {
    text: String(payload.text || "").trim(),
    model: transcriptionModel(),
  };
}
