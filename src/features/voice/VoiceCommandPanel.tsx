import { useState, type FormEvent } from "react";
import { Mic, MicOff, Sparkles, X } from "lucide-react";
import { useDictation } from "./useDictation";

export interface VoiceOutcome {
  added: string[];
  unmatched: string[];
  message: string;
}

export function VoiceCommandPanel({
  onCommand,
  onClose,
}: {
  onCommand: (transcript: string) => VoiceOutcome;
  onClose: () => void;
}) {
  const [manual, setManual] = useState("");
  const [outcome, setOutcome] = useState<VoiceOutcome | null>(null);
  const voice = useDictation((text) => setOutcome(onCommand(text)));
  const example =
    "Brystpress, rygghev, nedtrekk, beinpress 3 x 10 reps, 2 min pause mellom settene";
  const engineLabel =
    voice.engine === "whisper"
      ? "Whisper via lokal server"
      : voice.engine === "checking"
        ? "Sjekker lydmotor …"
        : "Nettleserens talegjenkjenning";

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = manual.trim();
    if (!value) return;
    setOutcome(onCommand(value));
    setManual("");
  }

  return (
    <section className="voice-panel" aria-label="Tale til program">
      <div className="voice-head">
        <span className="section-eyebrow">
          <Sparkles size={12} /> VOICE TO PROGRAMME
        </span>
        <button
          className="icon-button small"
          aria-label="Lukk tale til program"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      <p className="voice-hint">
        Si øvelsene og doseringen. For eksempel: «{example}».
      </p>
      <p className="voice-engine">
        Lydmotor: <strong>{engineLabel}</strong>
        {voice.note ? ` — ${voice.note}` : ""}
      </p>
      <div className="voice-controls">
        <button
          type="button"
          className={`voice-mic ${voice.listening ? "listening" : ""}`}
          aria-label={
            voice.listening ? "Stopp talestyring" : "Start talestyring"
          }
          aria-pressed={voice.listening}
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
        >
          {voice.listening ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{voice.listening ? "Lytter…" : "Snakk"}</span>
          <kbd>Ctrl</kbd>
          <kbd>Space</kbd>
        </button>
        {voice.engine === "whisper" && voice.microphones.length > 0 && (
          <label className="voice-mic-select">
            Mikrofon
            <select
              aria-label="Velg mikrofon"
              value={voice.microphoneId}
              onChange={(event) => voice.setMicrophoneId(event.target.value)}
            >
              <option value="">Standard</option>
              {voice.microphones.map((microphone) => (
                <option key={microphone.id} value={microphone.id}>
                  {microphone.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <form className="voice-manual" onSubmit={submit}>
          <label htmlFor="voice-manual-input">Skriv kommando</label>
          <div>
            <input
              id="voice-manual-input"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="…eller skriv kommandoen her"
              autoComplete="off"
            />
            <button type="submit" aria-label="Bruk kommando">
              Bruk
            </button>
          </div>
        </form>
      </div>
      {(voice.transcript || voice.interim) && (
        <p className="voice-transcript" aria-live="polite">
          {voice.transcript} <em>{voice.interim}</em>
        </p>
      )}
      {voice.error && (
        <p className="voice-error" role="alert">
          {voice.error}
        </p>
      )}
      {outcome && (
        <div className="voice-outcome" role="status">
          <strong>{outcome.message}</strong>
          {outcome.added.length > 0 && (
            <ul>
              {outcome.added.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
          {outcome.unmatched.length > 0 && (
            <p>Fant ikke: {outcome.unmatched.join(", ")}</p>
          )}
        </div>
      )}
    </section>
  );
}
