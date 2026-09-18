import type { Programme } from "../domain/programme";

export interface SessionUser {
  id: string;
  email: string;
  createdAt: string;
}

export type SessionCheck =
  | { status: "ok"; user: SessionUser }
  | { status: "signed-out" }
  | { status: "unreachable" };

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (payload as { error?: string }).error || "Forespørselen feilet.",
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return payload as T;
}

export async function fetchSession(): Promise<SessionCheck> {
  // Uten server (bare utviklingsserveren) skal appen falle raskt til lokal modus.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("/api/auth/me", { signal: controller.signal });
    if (response.status === 401) return { status: "signed-out" };
    if (!response.ok) return { status: "unreachable" };
    const payload = (await response.json()) as { user: SessionUser };
    return { status: "ok", user: payload.user };
  } catch {
    return { status: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function signIn(
  mode: "login" | "register",
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`/api/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await json<{ user: SessionUser }>(response);
  return payload.user;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchProgrammes(): Promise<Programme[]> {
  const response = await fetch("/api/programmes");
  if (response.status === 401) throw new Error("Ikke innlogget.");
  const payload = await json<{ programmes: Programme[] }>(response);
  return payload.programmes;
}

export async function putProgramme(programme: Programme): Promise<Programme> {
  const response = await fetch(
    `/api/programmes/${encodeURIComponent(programme.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(programme),
    },
  );
  const payload = await json<{ programme: Programme }>(response);
  return payload.programme;
}

export async function removeProgramme(
  id: string,
  revision: number,
): Promise<void> {
  const response = await fetch(
    `/api/programmes/${encodeURIComponent(id)}?revision=${revision}`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  await json(response);
}
