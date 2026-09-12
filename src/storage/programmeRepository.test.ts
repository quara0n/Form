import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { addExercise, newProgramme, type Exercise } from "../domain/programme";
import { copyProgramme } from "../features/programmes/useProgramme";
import {
  CorruptProgrammeError,
  DATABASE_NAME,
  ProgrammeConflictError,
  STORE_NAME,
  deleteProgramme,
  listProgrammes,
  saveProgramme,
} from "./programmeRepository";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
const exercise: Exercise = {
  id: "raise",
  name: "Heel raise",
  description: "Raise heels.",
  region: "Ankle",
  equipment: "None",
  tags: ["calf"],
  video: "/raise.mp4",
  poster: "/raise.svg",
  source: "original",
  credit: "Demo",
  license: "owned",
};
async function inject(record: unknown) {
  await listProgrammes();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    };
  });
}
describe("programme repository", () => {
  it("round trips ordered independent snapshots, raw input, notes and custom fields", async () => {
    let draft = addExercise(addExercise(newProgramme(), exercise), exercise);
    draft = { ...draft, title: "Calf work", instructions: "General notes" };
    draft.items[0].parameters = [
      { id: "a", key: "load", value: "7,5" },
      { id: "b", key: "custom", label: "Band", value: "Green" },
    ];
    draft.items[1].parameters = [{ id: "c", key: "reps", value: "8-" }];
    draft.items[1].notes = "Preserve\nnewlines";
    const saved = await saveProgramme(draft);
    expect(saved.revision).toBe(1);
    expect(draft.revision).toBe(0);
    expect(await listProgrammes()).toEqual([saved]);
    expect(saved.items).toEqual(draft.items);
  });
  it("atomically rejects one of two writers starting with the same revision", async () => {
    const saved = await saveProgramme(newProgramme());
    const results = await Promise.allSettled([
      saveProgramme({ ...saved, title: "Tab A" }),
      saveProgramme({ ...saved, title: "Tab B" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ProgrammeConflictError);
    expect((await listProgrammes())[0].revision).toBe(2);
  });
  it("rejects stale deletion and never resurrects a deleted revision", async () => {
    const first = await saveProgramme(newProgramme());
    const second = await saveProgramme({ ...first, title: "Latest" });
    await expect(
      deleteProgramme(first.id, first.revision),
    ).rejects.toBeInstanceOf(ProgrammeConflictError);
    await deleteProgramme(second.id, second.revision);
    await expect(saveProgramme(second)).rejects.toBeInstanceOf(
      ProgrammeConflictError,
    );
    expect(await listProgrammes()).toEqual([]);
  });
  it("duplicates without sharing identities or changing the source", async () => {
    const source = await saveProgramme(addExercise(newProgramme(), exercise));
    const duplicate = copyProgramme(source);
    duplicate.items[0].parameters[0].value = "4";
    const saved = await saveProgramme(duplicate);
    expect(saved.id).not.toBe(source.id);
    expect(saved.items[0].id).not.toBe(source.items[0].id);
    expect(saved.items[0].parameters[0].id).not.toBe(
      source.items[0].parameters[0].id,
    );
    expect((await listProgrammes()).find((p) => p.id === source.id)).toEqual(
      source,
    );
    await deleteProgramme(saved.id, saved.revision);
    expect(await listProgrammes()).toEqual([source]);
  });
  it("reports and retains corrupt records while exposing valid programmes", async () => {
    const saved = await saveProgramme(newProgramme());
    await inject({ id: "broken", schemaVersion: 42 });
    const problem = await listProgrammes().catch((e) => e);
    expect(problem).toBeInstanceOf(CorruptProgrammeError);
    expect(problem.validProgrammes).toEqual([saved]);
    await expect(
      saveProgramme({ ...newProgramme(), id: "broken" }),
    ).rejects.toBeInstanceOf(CorruptProgrammeError);
    await expect(deleteProgramme("broken", 0)).rejects.toBeInstanceOf(
      CorruptProgrammeError,
    );
    await expect(listProgrammes()).rejects.toBeInstanceOf(
      CorruptProgrammeError,
    );
  });
  it("propagates unavailable storage without mutating a draft", async () => {
    const draft = newProgramme();
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      writable: true,
      value: {
        open: () => {
          throw new DOMException("Denied", "SecurityError");
        },
      },
    });
    await expect(saveProgramme(draft)).rejects.toMatchObject({
      name: "SecurityError",
    });
    expect(draft.revision).toBe(0);
  });
});
