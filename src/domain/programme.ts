export interface Exercise {
  collection?: string;
  reviewNote?: string;
  id: string;
  name: string;
  description: string;
  region: string;
  equipment: string;
  tags: string[];
  video: string;
  poster: string;
  source: string;
  credit: string;
  license: string;
}
export type ParameterKey =
  | "sets"
  | "reps"
  | "duration"
  | "load"
  | "hold"
  | "rest"
  | "frequency"
  | "side"
  | "tempo"
  | "custom";
export interface Parameter {
  id: string;
  key: ParameterKey;
  value: string;
  unit?: string;
  label?: string;
}
export interface Prescription {
  id: string;
  exercise: Exercise;
  parameters: Parameter[];
  notes: string;
}
export interface Programme {
  id: string;
  schemaVersion: 1;
  revision: number;
  title: string;
  instructions: string;
  items: Prescription[];
  updatedAt: string;
}
export const parameterLabels: Record<ParameterKey, string> = {
  sets: "Sets",
  reps: "Reps",
  duration: "Duration",
  load: "Load",
  hold: "Hold",
  rest: "Rest",
  frequency: "Frequency",
  side: "Side",
  tempo: "Tempo / effort",
  custom: "Custom parameter",
};
/**
 * crypto.randomUUID finnes bare i sikre kontekster (https eller localhost).
 * Klinikken kan kjøre appen på en vanlig http-adresse på nettverket, så vi
 * faller tilbake til getRandomValues, som virker overalt.
 */
export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};
export const newParameter = (key: ParameterKey): Parameter => ({
  id: uid(),
  key,
  value: "",
  ...(key === "duration" ? { unit: "sec" } : {}),
});
export const newProgramme = (): Programme => ({
  id: uid(),
  schemaVersion: 1,
  revision: 0,
  title: "Untitled programme",
  instructions: "",
  items: [],
  updatedAt: new Date().toISOString(),
});
export function addExercise(p: Programme, exercise: Exercise): Programme {
  return addPrescription(p, exercise);
}
export interface PrescriptionValues {
  sets?: string;
  reps?: string;
  duration?: string;
  durationUnit?: "sec" | "min";
  load?: string;
  hold?: string;
  rest?: string;
  frequency?: string;
  side?: "Left" | "Right" | "Both";
  tempo?: string;
}
const prescriptionOrder = [
  "sets",
  "reps",
  "duration",
  "load",
  "hold",
  "rest",
  "frequency",
  "side",
  "tempo",
] as const satisfies readonly (keyof PrescriptionValues)[];
export function addPrescription(
  p: Programme,
  exercise: Exercise,
  values: PrescriptionValues = {},
): Programme {
  const parameters = prescriptionOrder
    .filter(
      (key) => values[key] !== undefined || key === "sets" || key === "reps",
    )
    .map((key) => ({
      ...newParameter(key),
      value: values[key] === undefined ? "" : String(values[key]),
      ...(key === "duration" ? { unit: values.durationUnit || "sec" } : {}),
    }));
  return {
    ...p,
    items: [
      ...p.items,
      {
        id: uid(),
        exercise: structuredClone(exercise),
        parameters,
        notes: "",
      },
    ],
  };
}
export function duplicateItem(p: Programme, id: string): Programme {
  const index = p.items.findIndex((i) => i.id === id);
  if (index < 0) return p;
  const copy = structuredClone(p.items[index]);
  copy.id = uid();
  copy.parameters = copy.parameters.map((v) => ({ ...v, id: uid() }));
  const items = [...p.items];
  items.splice(index + 1, 0, copy);
  return { ...p, items };
}
export function moveItem(
  p: Programme,
  id: string,
  direction: number,
): Programme {
  const from = p.items.findIndex((i) => i.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= p.items.length) return p;
  const items = [...p.items];
  [items[from], items[to]] = [items[to], items[from]];
  return { ...p, items };
}
export function validateParameter(p: Parameter): string {
  const v = p.value.trim();
  if (!v)
    return p.key === "custom" && p.label?.trim()
      ? "Enter a value or remove this parameter."
      : "";
  if (p.key === "custom") return p.label?.trim() ? "" : "Add a parameter name.";
  if (["frequency", "tempo"].includes(p.key)) return "";
  if (p.key === "side")
    return ["Left", "Right", "Both"].includes(v) ? "" : "Choose a side.";
  if (p.key === "reps") {
    const match = v.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    return match && +match[1] > 0 && (!match[2] || +match[2] >= +match[1])
      ? ""
      : "Use a positive number or range, e.g. 8–12.";
  }
  const number = Number(v.replace(",", "."));
  if (!/^\d+(?:[.,]\d+)?$/.test(v) || !Number.isFinite(number))
    return "Enter a valid number.";
  if (p.key === "sets" && !Number.isInteger(number))
    return "Use a whole number.";
  if (["load", "rest"].includes(p.key) ? number < 0 : number <= 0)
    return "Enter a positive value.";
  if (p.key === "duration" && !["sec", "min"].includes(p.unit || "sec"))
    return "Choose seconds or minutes.";
  return "";
}
export function formatParameter(p: Parameter): string {
  if (!p.value.trim() || validateParameter(p)) return "";
  const v = ["sets", "duration", "load", "hold", "rest"].includes(p.key)
    ? String(Number(p.value.replace(",", ".")))
    : p.value.trim().replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
  const suffix: Partial<Record<ParameterKey, string>> = {
    sets: " sets",
    reps: " reps / set",
    duration: ` ${p.unit || "sec"} / set`,
    load: " kg",
    hold: " sec / rep",
    rest: " sec rest",
  };
  return suffix[p.key] !== undefined
    ? v + suffix[p.key]
    : `${p.key === "custom" ? p.label : parameterLabels[p.key]}: ${v}`;
}
export function validateProgramme(p: Programme): string[] {
  const errors: string[] = [];
  if (!p.items.length) errors.push("Add an exercise before printing.");
  if (!p.title.trim()) errors.push("Give your programme a title.");
  p.items.forEach((item, index) =>
    item.parameters.forEach((v) => {
      const error = validateParameter(v);
      if (error)
        errors.push(
          `Exercise ${index + 1}, ${parameterLabels[v.key]}: ${error}`,
        );
    }),
  );
  return errors;
}
export function searchExercises(
  exercises: Exercise[],
  query: string,
  region: string,
  equipment: string,
): Exercise[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return exercises.filter(
    (e) =>
      (!region || e.region === region) &&
      (!equipment || e.equipment === equipment) &&
      words.every((word) =>
        [e.name, ...e.tags].join(" ").toLowerCase().includes(word),
      ),
  );
}
