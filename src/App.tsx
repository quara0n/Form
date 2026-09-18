import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  FolderOpen,
  Leaf,
  LoaderCircle,
  Mail,
  Mic,
  Plus,
  Printer,
  X,
  Copy,
  Trash2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import catalogue from "./data/exercises.json";
import generated from "./data/generated-exercises.json";
import {
  addExercise,
  addPrescription,
  validateProgramme,
  type Exercise,
  type Programme,
} from "./domain/programme";
import { useProgramme } from "./features/programmes/useProgramme";
import { ExerciseLibrary } from "./features/library/ExerciseLibrary";
import { ProgrammeBuilder } from "./features/builder/ProgrammeBuilder";
import { ProgrammeHandout } from "./features/print/ProgrammeHandout";
import { Modal } from "./components/Modal";
import { useAuth } from "./features/auth/AuthGate";
import {
  parseSpokenCommand,
  type SpokenPrescription,
} from "./features/voice/parseSpokenCommand";
import {
  VoiceCommandPanel,
  type VoiceOutcome,
} from "./features/voice/VoiceCommandPanel";

const standardEmailBody =
  "Hei,\n\nSe vedlagt treningsprogram.\n\nMvh\nRune Finne\nGPS Helse";

function describePrescription(item: SpokenPrescription): string {
  const dose = [
    item.sets && `${item.sets} sett`,
    item.reps && `${item.reps} reps`,
    item.duration &&
      `${item.duration} ${item.durationUnit === "min" ? "min" : "sek"}`,
    item.rest && `${item.rest} sek pause`,
  ].filter(Boolean);
  const unsure = (item.matchScore ?? 1) < 0.9;
  const heard = unsure && item.heard ? ` (usikker, hørte «${item.heard}»)` : "";
  return `${item.exercise.name}${dose.length ? ` — ${dose.join(", ")}` : ""}${heard}`;
}

export default function App() {
  const auth = useAuth();
  const workspace = useProgramme();
  const { programme, setProgramme, status, error, savedProgrammes } = workspace;
  const [savedOpen, setSavedOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printErrors, setPrintErrors] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState("library");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Programme | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailBody, setEmailBody] = useState(standardEmailBody);
  const exercises = [...generated, ...catalogue] as Exercise[];
  const counts = programme.items.reduce<Record<string, number>>(
    (all, item) => ({
      ...all,
      [item.exercise.id]: (all[item.exercise.id] || 0) + 1,
    }),
    {},
  );
  async function run(action: () => Promise<boolean>, done?: () => void) {
    setBusy(true);
    try {
      if (await action()) done?.();
    } finally {
      setBusy(false);
    }
  }
  function add(exercise: Exercise) {
    if (status === "loading") {
      setToast(
        "Your workspace is still loading. Please try again in a moment.",
      );
      return;
    }
    setProgramme((p) => addExercise(p, exercise));
    setToast(`${exercise.name} added`);
  }
  async function previewPrint() {
    const errors = validateProgramme(programme);
    setPrintErrors(errors);
    if (errors.length) {
      setMobileView("programme");
      return;
    }
    const token = await ensureShare();
    setShareUrl(token);
    setPrintOpen(true);
  }
  /**
   * Lager (eller henter) den åpne pasientlenken. Serveren svarer med den
   * adressen telefonen faktisk kan nå, så QR-koden ikke peker på localhost.
   */
  async function ensureShare(): Promise<string | null> {
    try {
      const response = await fetch(
        `/api/programmes/${encodeURIComponent(programme.id)}/share`,
        { method: "POST" },
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as { url?: string };
      return payload.url || null;
    } catch {
      return null;
    }
  }
  function emailSubject() {
    const title = programme.title.trim();
    return title && title !== "Untitled programme"
      ? `Treningsprogram – ${title}`
      : "Treningsprogram";
  }
  function emailHref() {
    const subject = `subject=${encodeURIComponent(emailSubject())}`;
    const body = `body=${encodeURIComponent(emailBody)}`;
    return `mailto:${encodeURIComponent(emailTo.trim())}?${subject}&${body}`;
  }
  async function copyEmailBody() {
    try {
      await navigator.clipboard.writeText(emailBody);
      setToast("Meldingen er kopiert");
    } catch {
      setToast("Kunne ikke kopiere meldingen automatisk");
    }
  }
  function handleVoiceCommand(transcript: string): VoiceOutcome {
    const result = parseSpokenCommand(transcript, exercises);
    if (!result.items.length)
      return {
        added: [],
        unmatched: result.unmatched.length ? result.unmatched : [transcript],
        message: "Fant ingen øvelser i det du sa.",
      };
    if (status === "loading")
      return {
        added: [],
        unmatched: [],
        message: "Arbeidsområdet lastes fortsatt. Prøv igjen om et øyeblikk.",
      };
    setProgramme((p) =>
      result.items.reduce(
        (next, item) => addPrescription(next, item.exercise, item),
        p,
      ),
    );
    setToast(
      `${result.items.length} øvelse${result.items.length === 1 ? "" : "r"} lagt til fra tale`,
    );
    return {
      added: result.items.map(describePrescription),
      unmatched: result.unmatched,
      message: `${result.items.length} øvelse${result.items.length === 1 ? "" : "r"} lagt til i programmet.`,
    };
  }
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        setVoiceOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <>
      <div className="app-shell">
        <aside className="nav-rail">
          <a
            className="brand-mark"
            href="#"
            aria-label="Form home"
            onClick={(e) => {
              e.preventDefault();
              setMobileView("library");
            }}
          >
            <Leaf size={28} />
          </a>
          <nav>
            <button
              className={!savedOpen ? "active" : ""}
              aria-label="Exercise library"
              title="Exercise library"
              onClick={() => {
                setSavedOpen(false);
                setMobileView("library");
              }}
            >
              <BookOpen size={22} />
            </button>
            <button
              className={savedOpen ? "active" : ""}
              aria-label="Saved programmes"
              title="Saved programmes"
              onClick={() => {
                void workspace.refreshList();
                setSavedOpen(true);
              }}
            >
              <FolderOpen size={22} />
            </button>
          </nav>
          <button
            className="help-button"
            aria-label="About Form"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={21} />
          </button>
          <div className="avatar" title="Local workspace">
            CL
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="topbar-brand">
              <img
                className="brand-logo"
                src="/brand/gps-helse.png"
                alt="GPS Helse"
                width={101}
                height={28}
              />
              <div className="wordmark">
                form<span>/ rehab</span>
                <span className="mvp-badge">EARLY EDITION</span>
              </div>
            </div>
            <div className="topbar-right">
              <span className="local-label">
                <span />{" "}
                {auth.user ? auth.user.email : "Lokal modus, ikke innlogget"}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  void workspace.refreshList();
                  setSavedOpen(true);
                }}
              >
                My programmes <ArrowUpRight size={15} />
              </button>
              {auth.user && (
                <button
                  className="text-button"
                  onClick={() => void auth.signOutNow()}
                >
                  Logg ut
                </button>
              )}
            </div>
          </header>
          <div className="mobile-switch">
            <button
              className={mobileView === "library" ? "active" : ""}
              onClick={() => setMobileView("library")}
            >
              Exercise library
            </button>
            <button
              className={mobileView === "programme" ? "active" : ""}
              onClick={() => setMobileView("programme")}
            >
              Programme <span>{programme.items.length}</span>
            </button>
          </div>
          <main className={`workspace-content mobile-${mobileView}`}>
            <aside className="builder-panel" aria-label="Programme builder">
              <div className="builder-header">
                <div>
                  <span className="section-eyebrow">MAKE IT PERSONAL</span>
                  <h2>
                    Your programme <span>{programme.items.length}</span>
                  </h2>
                </div>
                <div className="builder-actions">
                  <button
                    className="icon-button"
                    aria-label="Tale til program"
                    title="Tale til program (Ctrl+Space)"
                    aria-pressed={voiceOpen}
                    onClick={() => setVoiceOpen((open) => !open)}
                  >
                    <Mic size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Preview & print"
                    title="Forhåndsvis og skriv ut"
                    disabled={status === "loading"}
                    onClick={() => void previewPrint()}
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Send e-post"
                    title="Send programmet på e-post"
                    onClick={() => setEmailOpen(true)}
                  >
                    <Mail size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="New programme"
                    title="New programme"
                    disabled={busy || status === "loading"}
                    onClick={() =>
                      void run(workspace.createProgramme, () => {
                        setPrintErrors([]);
                        setMobileView("programme");
                      })
                    }
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              {voiceOpen && (
                <VoiceCommandPanel
                  onCommand={handleVoiceCommand}
                  onClose={() => setVoiceOpen(false)}
                />
              )}
              {status === "loading" ? (
                <div className="loading-state">
                  <LoaderCircle className="spinning" /> Opening your workspace…
                </div>
              ) : (
                <ProgrammeBuilder
                  key={programme.id}
                  programme={programme}
                  setProgramme={setProgramme}
                />
              )}
              {printErrors.length > 0 && (
                <div className="error-banner" role="alert">
                  <div>
                    <strong>One quick check before printing</strong>
                    <ul>
                      {printErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="icon-button small"
                    aria-label="Dismiss print errors"
                    onClick={() => setPrintErrors([])}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {error && (
                <div className="error-banner" role="alert">
                  <div>
                    <strong>Your changes need attention</strong>
                    <p>{error}</p>
                    <div className="error-actions">
                      <button onClick={() => void workspace.retry()}>
                        Retry save
                      </button>
                      <button onClick={() => void workspace.saveAsCopy()}>
                        Save as a copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="builder-footer">
                <div className="save-status" aria-live="polite">
                  {status === "saved" ? (
                    <Check size={14} />
                  ) : status === "error" ? (
                    <AlertCircle size={14} />
                  ) : (
                    <LoaderCircle size={14} className="spinning" />
                  )}
                  <span>
                    {status === "saved"
                      ? programme.revision
                        ? "Saved on this device"
                        : "Ready when you are"
                      : status === "error"
                        ? "Changes not saved"
                        : status === "loading"
                          ? "Loading…"
                          : "Saving…"}
                  </span>
                  <span>
                    {programme.items.length} exercise
                    {programme.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </aside>
            <div className="library-container">
              <ExerciseLibrary
                exercises={exercises}
                onAdd={add}
                counts={counts}
                busy={status === "loading"}
              />
            </div>
          </main>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {savedOpen && (
        <Modal title="My programmes" onClose={() => setSavedOpen(false)}>
          <div className="saved-content">
            <p className="muted">
              Saved on this browser. Pick up where you left off.
            </p>
            <button
              className="secondary-button full-width"
              disabled={busy}
              onClick={() =>
                void run(workspace.createProgramme, () => setSavedOpen(false))
              }
            >
              <Plus size={17} /> New programme
            </button>
            {!savedProgrammes.length ? (
              <div className="saved-empty">
                <FolderOpen size={32} />
                <h3>A fresh start</h3>
                <p>Your programmes will appear here as you create them.</p>
              </div>
            ) : (
              <div className="saved-list">
                {savedProgrammes.map((p) => (
                  <div className="saved-row" key={p.id}>
                    <button
                      className="saved-name"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => workspace.switchProgramme(p),
                          () => {
                            setSavedOpen(false);
                            setPrintErrors([]);
                          },
                        )
                      }
                    >
                      <strong>{p.title || "Untitled programme"}</strong>
                      <span>
                        {p.items.length} exercises ·{" "}
                        {new Date(p.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Duplicate ${p.title}`}
                      onClick={() =>
                        void run(
                          () => workspace.duplicateProgramme(p),
                          () => setSavedOpen(false),
                        )
                      }
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setConfirmDelete(p)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="Delete this programme?"
          onClose={() => setConfirmDelete(null)}
        >
          <div className="saved-content">
            <p>
              “{confirmDelete.title}” will be removed from this browser. This
              can’t be undone.
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setConfirmDelete(null)}
              >
                Keep programme
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => workspace.deleteSavedProgramme(confirmDelete),
                    () => setConfirmDelete(null),
                  )
                }
              >
                Delete programme
              </button>
            </div>
          </div>
        </Modal>
      )}
      {helpOpen && (
        <Modal
          title="A little movement. A lot of possibility."
          onClose={() => setHelpOpen(false)}
        >
          <div className="saved-content help-copy">
            <p>
              Form is a focused workspace for MSK clinicians. Browse a movement,
              add it to your programme, then tailor each exercise with the
              parameters you need.
            </p>
            <h3>A local first edition</h3>
            <p>
              Programmes stay in this browser. Clearing browser data removes
              them, and they do not sync across devices. Use general programme
              names and do not enter patient details.
            </p>
            <h3>Om videobiblioteket</h3>
            <p>
              Biblioteket inneholder egne AI-genererte videoer og den
              opprinnelige lisensierte samlingen. Tidligere forsøk med kjente
              avvik har en videomerknad. Du vurderer utførelse, dosering og
              tilpasninger.
            </p>
            <p>
              Klikk på øvelsens bilde eller navn i programmet for å åpne videoen
              og redigere beskrivelsen. Teksten lagres med programmet og følger
              med på utskriften. Kildeinformasjon finnes i
              videoforhåndsvisningen.
            </p>
            <button
              className="primary-button full-width"
              onClick={() => setHelpOpen(false)}
            >
              Back to your workspace <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {printOpen && (
        <Modal
          title="Programme preview"
          onClose={() => setPrintOpen(false)}
          wide
        >
          <div className="print-toolbar">
            <span>One clear handout. Save as PDF from the print dialog.</span>
            <button className="primary-button" onClick={() => window.print()}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
          <ProgrammeHandout programme={programme} shareUrl={shareUrl} />
        </Modal>
      )}
      {emailOpen && (
        <Modal title="Send e-post" onClose={() => setEmailOpen(false)}>
          <div className="saved-content email-form">
            <p className="muted">
              Meldingen er ferdig utfylt. Husk å legge ved PDF-en i
              e-postklienten — lag den med skriver-ikonet i verktøylinjen først.
            </p>
            <label>
              E-post til
              <input
                type="email"
                value={emailTo}
                placeholder="navn@klinikk.no"
                onChange={(event) => setEmailTo(event.target.value)}
              />
            </label>
            <label>
              Melding
              <textarea
                rows={7}
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => void copyEmailBody()}
              >
                <Copy size={16} /> Kopier melding
              </button>
              <a className="primary-button" href={emailHref()}>
                <Mail size={16} /> Åpne e-postklient
              </a>
            </div>
          </div>
        </Modal>
      )}
      <div className="print-only">
        {status !== "loading" && validateProgramme(programme).length === 0 ? (
          <ProgrammeHandout programme={programme} shareUrl={shareUrl} />
        ) : (
          <div className="handout">
            <h1>Programme not ready to print</h1>
            <p>
              Return to the builder and correct these issues before printing.
            </p>
            <ul>
              {(status === "loading"
                ? ["Wait for your workspace to finish loading."]
                : validateProgramme(programme)
              ).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
