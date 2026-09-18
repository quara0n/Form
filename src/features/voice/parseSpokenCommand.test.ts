import { test, expect } from "vitest";
import generated from "../../data/generated-exercises.json";
import catalogue from "../../data/exercises.json";
import type { Exercise } from "../../domain/programme";
import { parseSpokenCommand, stripDosage } from "./parseSpokenCommand";

const exercises = [...generated, ...catalogue] as Exercise[];

test("reads the exercises, sets, reps and rest from one spoken command", () => {
  const result = parseSpokenCommand(
    "Brystpress, nedtrekk, beinpress og flyes 3 x 10 reps, 2 min pause mellom settene",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Brystpress i apparat",
    "Nedtrekk til bryst i apparat",
    "Benpress i apparat",
    "Flyes i apparat",
  ]);
  expect(result.items[3]).toMatchObject({
    sets: "3",
    reps: "10",
    rest: "120",
  });
  expect(result.items.map((item) => item.rest)).toEqual([
    "120",
    "120",
    "120",
    "120",
  ]);
  expect(result.unmatched).toEqual([]);
});

test("keeps a rep range, a duration and a side", () => {
  const range = parseSpokenCommand(
    "Sittende leg curl 3 x 8-12 reps",
    exercises,
  );
  expect(range.items[0]).toMatchObject({ sets: "3", reps: "8–12" });

  const duration = parseSpokenCommand("Flyes 2 x 30 sekunder", exercises);
  expect(duration.items[0]).toMatchObject({
    sets: "2",
    duration: "30",
    durationUnit: "sec",
  });

  const side = parseSpokenCommand("Leg extension venstre 3 x 12", exercises);
  expect(side.items[0]).toMatchObject({ sets: "3", reps: "12", side: "Left" });
});

test("applies a dosage that follows all exercises to every exercise", () => {
  const result = parseSpokenCommand(
    "Brystpress og benpress, 4 sett, 90 sek pause",
    exercises,
  );
  expect(result.items).toHaveLength(2);
  expect(result.items.map((item) => item.rest)).toEqual(["90", "90"]);
  expect(result.items.map((item) => item.sets)).toEqual(["4", "4"]);
});

test("reports exercise names it cannot place", () => {
  const result = parseSpokenCommand(
    "Brystpress og håndbak mot veggen",
    exercises,
  );
  expect(result.items).toHaveLength(1);
  expect(result.unmatched.join(" ")).toContain("håndbak");
});

test("strips dosage wording before matching a name", () => {
  expect(stripDosage("Nedtrekk til bryst 3 x 10 reps, 2 min pause")).toBe(
    "nedtrekk til bryst",
  );
});

test("finds exercises inside free-running speech", () => {
  const result = parseSpokenCommand(
    "OK men jeg trenger den diagonalen forsek to Vi trenger å se et left med strikk vi trenger sideplanke på knærne forsek 1 sideplanke på knærne for seg tre og i De øvelsene skal vi ha 10 reps og 3 6",
    exercises,
  );
  const names = result.items.map((item) => item.exercise.name);
  expect(names).toContain("Diagonalen – forsøk 2");
  expect(names).toContain("Sideplanke på knærne – forsøk 1");
  const dosed = result.items.filter(
    (item) =>
      item.exercise.name === "Diagonalen – forsøk 2" ||
      item.exercise.name === "Sideplanke på knærne – forsøk 1",
  );
  expect(
    dosed.every((item) => item.reps === "10"),
    JSON.stringify(dosed.map((item) => [item.exercise.name, item.reps])),
  ).toBe(true);
});

test("matches names even when the recognition slips", () => {
  const cases: [string, string][] = [
    ["benpres 3 x 10", "Benpress i apparat"],
    ["bryst pres, 3 x 10 reps", "Brystpress i apparat"],
    ["skulderpres 3x12", "Shoulder press"],
    ["nedrek til bryst 3 x 10", "Nedtrekk til bryst i apparat"],
    ["leg extention 3 x 12", "Leg extension i apparat"],
    ["diagonalen forsek 3", "Diagonalen – forsøk 3"],
    ["kneboy med rod strikk", "Knebøy med rød strikk"],
  ];
  for (const [spoken, expected] of cases) {
    const result = parseSpokenCommand(spoken, exercises);
    expect(
      result.items.map((item) => item.exercise.name),
      spoken,
    ).toContain(expected);
  }
});

test("catches dosage words on their own", () => {
  const sets = parseSpokenCommand("brystpress 3 sett 10 reps", exercises);
  expect(sets.items[0]).toMatchObject({ sets: "3", reps: "10" });

  const words = parseSpokenCommand("benpress tre ganger ti reps", exercises);
  expect(words.items[0]).toMatchObject({ sets: "3", reps: "10" });

  const compact = parseSpokenCommand("flyes 4x8", exercises);
  expect(compact.items[0]).toMatchObject({ sets: "4", reps: "8" });
});

test("applies a dose that ends with «på alle» to every exercise", () => {
  const result = parseSpokenCommand(
    "bekkenløft, diagonalen, knebøy og 3 sett og 10 reps på alle",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Seteløft uten strikk",
    "Diagonalen – forsøk 1",
    "Knebøy med rød strikk",
  ]);
  expect(result.items.map((item) => item.sets)).toEqual(["3", "3", "3"]);
  expect(result.items.map((item) => item.reps)).toEqual(["10", "10", "10"]);
  expect(result.unmatched).toEqual([]);
});

test("adds a spoken pause as rest on the exercise it follows", () => {
  const result = parseSpokenCommand(
    "diagonalen 3 x 10 og 2 min pause",
    exercises,
  );
  expect(result.items[0]).toMatchObject({
    sets: "3",
    reps: "10",
    rest: "120",
  });
});

test("adds sets, reps and a pause at the end to every named exercise", () => {
  const result = parseSpokenCommand(
    "bekkenløft, diagonalen og knebøy, 3 sett og 10 reps på alle, 2 min pause",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Seteløft uten strikk",
    "Diagonalen – forsøk 1",
    "Knebøy med rød strikk",
  ]);
  expect(result.items.map((item) => item.sets)).toEqual(["3", "3", "3"]);
  expect(result.items.map((item) => item.reps)).toEqual(["10", "10", "10"]);
  expect(result.items.map((item) => item.rest)).toEqual(["120", "120", "120"]);
  expect(result.unmatched).toEqual([]);
});

test("gir dosen til begge øvelsene når setningen sier «på begge øvelser»", () => {
  const result = parseSpokenCommand(
    "knebøy, clamshell med strikk, 3 sett og 10 reps på begge øvelser",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Knebøy med rød strikk",
    "Clamshell med rød strikk",
  ]);
  expect(result.items.map((item) => item.sets)).toEqual(["3", "3"]);
  expect(result.items.map((item) => item.reps)).toEqual(["10", "10"]);
  // «begge» peker på øvelsene, ikke på sider, så ingen side skal legges inn.
  expect(result.items.map((item) => item.side)).toEqual([undefined, undefined]);
});

test("beholder «begge sider» som side, ikke som alle øvelsene", () => {
  const sides = parseSpokenCommand(
    "clamshell med strikk 3 x 10 begge sider",
    exercises,
  );
  expect(sides.items[0]).toMatchObject({ sets: "3", reps: "10", side: "Both" });

  const both = parseSpokenCommand(
    "knebøy, clamshell med strikk og 3 sett og 10 reps på begge",
    exercises,
  );
  expect(both.items.map((item) => item.sets)).toEqual(["3", "3"]);
  expect(both.items.map((item) => item.side)).toEqual([undefined, undefined]);
});

test("tolker ikke sideord som øvelsesnavn", () => {
  // «sider» begynner likt «Sideplanke» og ble tidligere tolket som en øvelse.
  const result = parseSpokenCommand(
    "clamshell med strikk begge sider 3 x 10",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Clamshell med rød strikk",
  ]);
  expect(result.items[0]).toMatchObject({ sets: "3", reps: "10" });
});

test("gir alle øvelsene dosen når setningen sier «alle skal ha»", () => {
  const result = parseSpokenCommand(
    "Clamshell, seteløft, diagonal, alle skal ha 3 sett med 10 reps.",
    exercises,
  );
  expect(result.items.map((item) => item.exercise.name)).toEqual([
    "Clamshell med rød strikk",
    "Seteløft med strikk",
    "Diagonalen – forsøk 1",
  ]);
  expect(result.items.map((item) => item.sets)).toEqual(["3", "3", "3"]);
  expect(result.items.map((item) => item.reps)).toEqual(["10", "10", "10"]);
  // «hørte» skal vise øvelsesnavnet, ikke ordene rundt.
  expect(result.items.map((item) => item.heard)).toEqual([
    "clamshell",
    "seteløft",
    "diagonal",
  ]);
});

test("tar imot vanlige varianter av «alle skal ha»", () => {
  const variants = [
    "clamshell, seteløft og diagonal, alle skal ha 3 sett og 10 reps",
    "clamshell, seteløft og diagonal, alle skal kjøre 3 x 10",
    "clamshell, seteløft og diagonal, alle får 3 sett og 10 reps",
    "clamshell, seteløft og diagonal, alle øvelsene skal ha 3 sett og 10 reps",
    "clamshell, seteløft og diagonal, 3 sett og 10 reps på alle",
  ];
  for (const sentence of variants) {
    const result = parseSpokenCommand(sentence, exercises);
    expect(
      result.items.map((item) => item.sets),
      sentence,
    ).toEqual(["3", "3", "3"]);
    expect(
      result.items.map((item) => item.reps),
      sentence,
    ).toEqual(["10", "10", "10"]);
  }
});
