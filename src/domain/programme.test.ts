import { describe, expect, it } from "vitest";
import {
  addExercise,
  duplicateItem,
  newProgramme,
  moveItem,
  validateParameter,
  formatParameter,
  validateProgramme,
} from "./programme";
const exercise = {
  id: "squat",
  name: "Squat",
  description: "Sit back.",
  region: "Lower body",
  equipment: "Bodyweight",
  tags: ["legs"],
  video: "/squat.webm",
  poster: "/squat.jpg",
  source: "https://commons.wikimedia.org",
  credit: "CDC",
  license: "Public domain",
};
describe("prescriptions", () => {
  it("keeps instances independent and reorders by identity", () => {
    let p = addExercise(newProgramme(), exercise);
    p.items[0].parameters[0].value = "3";
    p = duplicateItem(p, p.items[0].id);
    p.items[1].parameters[0].value = "5";
    expect(p.items[0].parameters[0].value).toBe("3");
    expect(new Set(p.items.map((i) => i.id)).size).toBe(2);
    expect(moveItem(p, p.items[1].id, -1).items[0].parameters[0].value).toBe(
      "5",
    );
  });
  it("validates dosage boundaries", () => {
    expect(
      validateParameter({ id: "x", key: "reps", value: "12-8" }),
    ).toBeTruthy();
    expect(
      validateParameter({ id: "x", key: "sets", value: "2.5" }),
    ).toBeTruthy();
    expect(
      validateParameter({ id: "x", key: "load", value: "-1" }),
    ).toBeTruthy();
    expect(validateParameter({ id: "x", key: "load", value: "7,5" })).toBe("");
    expect(validateParameter({ id: "x", key: "reps", value: "8–12" })).toBe("");
  });
  it("distinguishes blank and zero and formats units", () => {
    expect(formatParameter({ id: "x", key: "load", value: "" })).toBe("");
    expect(formatParameter({ id: "x", key: "load", value: "0" })).toBe("0 kg");
    expect(
      formatParameter({ id: "x", key: "duration", value: "2", unit: "min" }),
    ).toBe("2 min / set");
    expect(formatParameter({ id: "x", key: "load", value: "7,5" })).toBe(
      "7.5 kg",
    );
  });
  it("blocks empty output and missing custom labels", () => {
    expect(validateProgramme(newProgramme()).length).toBeGreaterThan(0);
    expect(
      validateParameter({
        id: "x",
        key: "custom",
        value: "20 metres",
        label: "",
      }),
    ).toBeTruthy();
  });
});
