import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { newProgramme, uid, type Programme } from "../../domain/programme";
import {
  CorruptProgrammeError,
  deleteProgramme,
  listProgrammes,
  saveProgramme,
} from "../../storage/programmeRepository";

export type SaveStatus = "loading" | "saving" | "saved" | "error";
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Local storage is unavailable. Your edits remain here; retry saving.";
export function copyProgramme(source: Programme): Programme {
  const copy = structuredClone(source);
  return {
    ...copy,
    id: uid(),
    revision: 0,
    title: `${source.title || "Untitled programme"} (copy)`,
    updatedAt: new Date().toISOString(),
    items: copy.items.map((item) => ({
      ...item,
      id: uid(),
      parameters: item.parameters.map((p) => ({ ...p, id: uid() })),
    })),
  };
}

export function useProgramme() {
  const [programme, renderProgramme] = useState<Programme>(newProgramme);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedProgrammes, setSavedProgrammes] = useState<Programme[]>([]);
  const current = useRef(programme);
  const dirty = useRef(false);
  const mounted = useRef(false);
  const ready = useRef(false);
  const version = useRef(0);
  const pending = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRunning = useRef(false);
  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const fail = useCallback((e: unknown) => {
    if (mounted.current) {
      setError(message(e));
      setStatus("error");
    }
  }, []);
  const show = useCallback((p: Programme) => {
    current.current = p;
    if (mounted.current) renderProgramme(p);
  }, []);
  const refreshList = useCallback(async () => {
    try {
      const list = await listProgrammes();
      if (mounted.current) setSavedProgrammes(list);
      return true;
    } catch (e) {
      if (e instanceof CorruptProgrammeError && mounted.current)
        setSavedProgrammes(e.validProgrammes);
      fail(e);
      return false;
    }
  }, [fail]);
  const flush = useCallback(async (): Promise<boolean> => {
    cancelTimer();
    if (pending.current) return pending.current;
    if (!dirty.current) return true;
    const task = (async () => {
      while (dirty.current) {
        const snapshot = current.current;
        const savingVersion = version.current;
        if (mounted.current) {
          setStatus("saving");
          setError(null);
        }
        try {
          const saved = await saveProgramme(snapshot);
          // Actions cannot switch documents while a write is pending. New edits inherit the committed revision.
          const latest = current.current;
          show({
            ...latest,
            revision: saved.revision,
            updatedAt: saved.updatedAt,
          });
          dirty.current = version.current !== savingVersion;
          if (mounted.current)
            setSavedProgrammes((list) =>
              [saved, ...list.filter((p) => p.id !== saved.id)].sort((a, b) =>
                b.updatedAt.localeCompare(a.updatedAt),
              ),
            );
        } catch (e) {
          fail(e);
          return false;
        }
      }
      if (mounted.current) {
        setStatus("saved");
        setError(null);
      }
      return true;
    })();
    pending.current = task;
    try {
      return await task;
    } finally {
      pending.current = null;
    }
  }, [cancelTimer, fail, show]);
  const setProgramme = useCallback(
    (update: SetStateAction<Programme>) => {
      if (!ready.current) return;
      const previous = current.current;
      const next = typeof update === "function" ? update(previous) : update;
      if (next === previous) return;
      show({ ...next, id: previous.id, revision: previous.revision });
      version.current += 1;
      dirty.current = true;
      setStatus("saving");
      cancelTimer();
      timer.current = setTimeout(() => {
        void flush();
      }, 350);
    },
    [cancelTimer, flush, show],
  );
  const select = useCallback(
    (p: Programme) => {
      cancelTimer();
      dirty.current = false;
      version.current += 1;
      show(structuredClone(p));
      setStatus("saved");
      setError(null);
    },
    [cancelTimer, show],
  );
  const action = useCallback(
    async (run: () => Promise<void>, skipFlush = false) => {
      if (!ready.current || actionRunning.current) return false;
      actionRunning.current = true;
      try {
        if (!skipFlush && !(await flush())) return false;
        await run();
        return true;
      } catch (e) {
        fail(e);
        return false;
      } finally {
        actionRunning.current = false;
      }
    },
    [fail, flush],
  );
  const switchProgramme = useCallback(
    (p: Programme) =>
      action(async () => {
        let list: Programme[];
        try {
          list = await listProgrammes();
        } catch (e) {
          if (!(e instanceof CorruptProgrammeError)) throw e;
          list = e.validProgrammes;
        }
        // Edits made while the read was pending also need to be committed before navigating.
        if (!(await flush()))
          throw new Error(
            "Your current edits could not be saved. Retry or save them as a copy before opening another programme.",
          );
        if (p.id === current.current.id) return;
        const latest = list.find((saved) => saved.id === p.id);
        if (!latest)
          throw new Error(
            "This saved programme is no longer available. Your current programme is still open.",
          );
        select(latest);
      }),
    [action, flush, select],
  );
  const createProgramme = useCallback(
    () =>
      action(async () => {
        select(newProgramme());
      }),
    [action, select],
  );
  const duplicateProgramme = useCallback(
    (p: Programme) =>
      action(async () => {
        const source = p.id === current.current.id ? current.current : p;
        const copy = await saveProgramme(copyProgramme(source));
        if (!(await flush()))
          throw new Error(
            "The copy was saved, but your current edits could not be saved. Retry before switching.",
          );
        select(copy);
        await refreshList();
      }),
    [action, flush, refreshList, select],
  );
  const saveAsCopy = useCallback(
    () =>
      action(async () => {
        cancelTimer();
        if (pending.current) await pending.current;
        // Keep edits made during the save on the new copy; never erase the visible draft on failure.
        const before = version.current;
        const copy = await saveProgramme(copyProgramme(current.current));
        if (version.current === before) select(copy);
        else {
          show({
            ...current.current,
            id: copy.id,
            title: copy.title,
            revision: copy.revision,
            updatedAt: copy.updatedAt,
          });
          dirty.current = true;
          if (!(await flush()))
            throw new Error(
              "The copy was created, but your latest edits still need to be saved. They remain visible here.",
            );
        }
        await refreshList();
      }, true),
    [action, cancelTimer, flush, refreshList, select, show],
  );
  const deleteSavedProgramme = useCallback(
    (p: Programme) =>
      action(async () => {
        const target = current.current.id === p.id ? current.current : p;
        // Deletion confirmation belongs to the calling UI.
        const before = version.current;
        await deleteProgramme(target.id, target.revision);
        if (current.current.id === target.id) {
          if (version.current !== before) {
            // Preserve any typing during the delete as a new unsaved draft.
            show({ ...current.current, id: uid(), revision: 0 });
            dirty.current = true;
            if (!(await flush()))
              throw new Error(
                "The saved programme was deleted. Your newer edits remain here as an unsaved draft.",
              );
          } else select(newProgramme());
        }
        await refreshList();
      }),
    [action, flush, refreshList, select, show],
  );
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const load = async () => {
      try {
        const list = await listProgrammes();
        if (cancelled) return;
        setSavedProgrammes(list);
        if (list[0]) show(list[0]);
        setStatus("saved");
        ready.current = true;
      } catch (e) {
        if (cancelled) return;
        if (e instanceof CorruptProgrammeError) {
          setSavedProgrammes(e.validProgrammes);
          if (e.validProgrammes[0]) show(e.validProgrammes[0]);
        }
        ready.current = true;
        fail(e);
      }
    };
    void load();
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      cancelled = true;
      mounted.current = false;
      cancelTimer();
      window.removeEventListener("beforeunload", unload);
    };
  }, [cancelTimer, fail, show]);
  return {
    programme,
    setProgramme,
    status,
    error,
    savedProgrammes,
    switchProgramme,
    createProgramme,
    duplicateProgramme,
    deleteSavedProgramme,
    retry: flush,
    saveAsCopy,
    refreshList,
  };
}
