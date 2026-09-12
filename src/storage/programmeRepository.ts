import { parameterLabels, type Programme } from "../domain/programme";

export const DATABASE_NAME = "form-rehab";
export const STORE_NAME = "programmes";
export class ProgrammeConflictError extends Error {
  constructor() {
    super(
      "This programme changed in another tab. Save your edits as a copy, then open the saved programme from My programmes.",
    );
    this.name = "ProgrammeConflictError";
  }
}
export class CorruptProgrammeError extends Error {
  constructor(public readonly validProgrammes: Programme[] = []) {
    super(
      "Some saved programmes are damaged or use an unsupported format. They have been retained without changes.",
    );
    this.name = "CorruptProgrammeError";
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object";
const strings = (o: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof o[k] === "string");
export function isProgramme(v: unknown): v is Programme {
  if (
    !object(v) ||
    v.schemaVersion !== 1 ||
    !Number.isInteger(v.revision) ||
    Number(v.revision) < 0 ||
    !strings(v, ["id", "title", "instructions", "updatedAt"]) ||
    !v.id ||
    !Number.isFinite(Date.parse(String(v.updatedAt))) ||
    !Array.isArray(v.items)
  )
    return false;
  const ids = new Set<string>();
  return v.items.every((item) => {
    if (
      !object(item) ||
      !strings(item, ["id", "notes"]) ||
      !item.id ||
      ids.has(String(item.id)) ||
      !object(item.exercise) ||
      !strings(item.exercise, [
        "id",
        "name",
        "description",
        "region",
        "equipment",
        "video",
        "poster",
        "source",
        "credit",
        "license",
      ]) ||
      !Array.isArray(item.exercise.tags) ||
      !item.exercise.tags.every((t) => typeof t === "string") ||
      !Array.isArray(item.parameters)
    )
      return false;
    ids.add(String(item.id));
    const parameters = new Set<string>();
    return item.parameters.every((p) => {
      if (
        !object(p) ||
        !strings(p, ["id", "key", "value"]) ||
        !p.id ||
        parameters.has(String(p.id)) ||
        !Object.hasOwn(parameterLabels, String(p.key)) ||
        (p.unit !== undefined && typeof p.unit !== "string") ||
        (p.label !== undefined && typeof p.label !== "string")
      )
        return false;
      parameters.add(String(p.id));
      return true;
    });
  });
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Local storage is busy in another tab. Close that tab and retry.",
        ),
      );
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  work: (
    store: IDBObjectStore,
    finish: (result: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    let result: T;
    let failure: Error | null = null;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(
        failure ||
          tx.error ||
          new Error("Local storage could not save your changes."),
      );
    };
    tx.onerror = () => {
      /* onabort handles the failed transaction */
    };
    const fail = (error: Error) => {
      failure = error;
      tx.abort();
    };
    try {
      work(
        tx.objectStore(STORE_NAME),
        (value) => {
          result = value;
        },
        fail,
      );
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
export async function listProgrammes(): Promise<Programme[]> {
  const records = await transaction<unknown[]>("readonly", (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => finish(request.result);
  });
  const valid = records
    .filter(isProgramme)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (valid.length !== records.length) throw new CorruptProgrammeError(valid);
  return valid;
}
export async function saveProgramme(programme: Programme): Promise<Programme> {
  const draft = structuredClone(programme);
  if (!isProgramme(draft)) throw new CorruptProgrammeError();
  return transaction<Programme>("readwrite", (store, finish, fail) => {
    const request = store.get(draft.id);
    request.onsuccess = () => {
      const current: unknown = request.result;
      if (current !== undefined && !isProgramme(current))
        return fail(new CorruptProgrammeError());
      if (
        (current === undefined && draft.revision !== 0) ||
        (isProgramme(current) && current.revision !== draft.revision)
      )
        return fail(new ProgrammeConflictError());
      const saved: Programme = {
        ...draft,
        revision: draft.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.put(saved);
      finish(saved);
    };
  });
}
export async function deleteProgramme(
  id: string,
  revision: number,
): Promise<void> {
  return transaction<void>("readwrite", (store, finish, fail) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const current: unknown = request.result;
      if (current !== undefined && !isProgramme(current))
        return fail(new CorruptProgrammeError());
      if (!isProgramme(current) || current.revision !== revision)
        return fail(new ProgrammeConflictError());
      store.delete(id);
      finish();
    };
  });
}
