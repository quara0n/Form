import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowRight, Leaf, LoaderCircle } from "lucide-react";
import {
  fetchSession,
  signIn,
  signOut,
  type SessionUser,
} from "../../api/client";
import {
  isProgramme,
  listProgrammes as listLocalProgrammes,
} from "../../storage/programmeRepository";
import { setStorageMode } from "../../storage/programmeStore";

interface AuthState {
  user: SessionUser | null;
  mode: "server" | "local";
  signOutNow: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  mode: "local",
  signOutNow: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

type Phase = "checking" | "signed-out" | "ready";

/**
 * Sjekker sesjonen mot serveren. Svarer ikke serveren, kjører appen videre i
 * lokal modus slik at arbeidet ikke stopper.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [mode, setMode] = useState<"server" | "local">("local");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Testoppsett kan be om ren lokal modus, uavhengig av om API-et kjører.
      if (import.meta.env.VITE_LOCAL_ONLY === "1") {
        setStorageMode("local");
        setMode("local");
        setPhase("ready");
        return;
      }
      const session = await fetchSession();
      if (cancelled) return;
      if (session.status === "ok") {
        setStorageMode("server");
        setUser(session.user);
        setMode("server");
      } else {
        setStorageMode("local");
        setMode("local");
      }
      setPhase(session.status === "signed-out" ? "signed-out" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Flytter programmer som bare finnes i denne nettleseren opp på kontoen. */
  async function importLocalProgrammes(): Promise<number> {
    const local = (await listLocalProgrammes()).filter(isProgramme);
    let moved = 0;
    for (const programme of local) {
      const response = await fetch(
        `/api/programmes/${encodeURIComponent(programme.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...programme, revision: 0 }),
        },
      );
      if (response.ok) moved += 1;
    }
    return moved;
  }

  async function submit(event: FormEvent, action: "login" | "register") {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const account = await signIn(action, email, password);
      setStorageMode("server");
      const moved = await importLocalProgrammes().catch(() => 0);
      setUser(account);
      setMode("server");
      setNotice(
        moved
          ? `${moved} program${moved === 1 ? "" : "mer"} fra denne nettleseren ble lagt til kontoen.`
          : "",
      );
      setPhase("ready");
      setPassword("");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Kunne ikke logge inn. Prøv igjen.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOutNow() {
    await signOut().catch(() => {});
    setStorageMode("local");
    setUser(null);
    setMode("local");
    setPhase("signed-out");
    setNotice("");
  }

  if (phase === "checking")
    return (
      <div className="auth-screen">
        <p className="auth-loading">
          <LoaderCircle size={18} className="spinning" /> Kobler til …
        </p>
      </div>
    );

  if (phase === "signed-out")
    return (
      <div className="auth-screen">
        <form
          className="auth-card"
          onSubmit={(event) => void submit(event, "login")}
        >
          <div className="auth-brand">
            <img src="/brand/gps-helse.png" alt="GPS Helse" height={26} />
            <span>
              <Leaf size={16} /> form / rehab
            </span>
          </div>
          <h1>Logg inn</h1>
          <p>
            Programmene lagres på kontoen din, slik at de følger deg og ikke
            nettleseren. Bruk en arbeidskonto.
          </p>
          <label>
            E-post
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Passord
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              required
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="auth-actions">
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Logger inn …" : "Logg inn"}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={(event) => void submit(event, "register")}
            >
              Opprett konto
            </button>
          </div>
          <p className="auth-hint">
            Passordet må ha minst 10 tegn. Glemt passord er ikke støttet ennå.
          </p>
        </form>
      </div>
    );

  return (
    <AuthContext.Provider value={{ user, mode, signOutNow }}>
      {children}
      {mode === "local" && (
        <p className="mode-banner" role="status">
          Lokal modus: serveren svarer ikke, så programmer lagres bare i denne
          nettleseren.
        </p>
      )}
      {notice && (
        <p className="mode-banner" role="status">
          {notice}
        </p>
      )}
    </AuthContext.Provider>
  );
}
