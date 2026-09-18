import type { Programme } from "../domain/programme";
import { fetchProgrammes, putProgramme, removeProgramme } from "../api/client";
import {
  CorruptProgrammeError,
  ProgrammeConflictError,
  isProgramme,
} from "./programmeRepository";

const status = (error: unknown): number | undefined =>
  (error as { status?: number } | undefined)?.status;

/**
 * Samme grensesnitt som den lokale lagringen, men alt går til serveren slik
 * at programmene følger brukeren og ikke nettleseren.
 */
export async function listProgrammes(): Promise<Programme[]> {
  const programmes = await fetchProgrammes();
  const valid = programmes.filter(isProgramme);
  if (valid.length !== programmes.length)
    throw new CorruptProgrammeError(valid);
  return [...valid].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProgramme(programme: Programme): Promise<Programme> {
  if (!isProgramme(programme)) throw new CorruptProgrammeError();
  try {
    return await putProgramme(programme);
  } catch (error) {
    if (status(error) === 409) throw new ProgrammeConflictError();
    throw error;
  }
}

export async function deleteProgramme(
  id: string,
  revision: number,
): Promise<void> {
  try {
    await removeProgramme(id, revision);
  } catch (error) {
    if (status(error) === 409) throw new ProgrammeConflictError();
    throw error;
  }
}
