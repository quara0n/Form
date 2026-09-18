import type { Programme } from "../domain/programme";
import * as local from "./programmeRepository";
import * as server from "./serverProgrammeRepository";

export {
  CorruptProgrammeError,
  ProgrammeConflictError,
} from "./programmeRepository";

/**
 * Appen kan kjøre lokalt (bare denne nettleseren) eller mot serveren når
 * brukeren er logget inn. AuthGate setter modus før programmet lastes.
 */
export type StorageMode = "local" | "server";
let mode: StorageMode = "local";

export function setStorageMode(next: StorageMode): void {
  mode = next;
}

export function storageMode(): StorageMode {
  return mode;
}

export function listProgrammes(): Promise<Programme[]> {
  return mode === "server" ? server.listProgrammes() : local.listProgrammes();
}

export function saveProgramme(programme: Programme): Promise<Programme> {
  return mode === "server"
    ? server.saveProgramme(programme)
    : local.saveProgramme(programme);
}

export function deleteProgramme(id: string, revision: number): Promise<void> {
  return mode === "server"
    ? server.deleteProgramme(id, revision)
    : local.deleteProgramme(id, revision);
}

export function isLocalMode(): boolean {
  return mode === "local";
}
