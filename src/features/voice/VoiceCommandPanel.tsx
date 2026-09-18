import { useState, type FormEvent } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { useDictation } from "./useDictation";

export interface VoiceOutcome {
  added: string[];
  unmatched: string[];
  message: string;
}

/** Ulike vekter gir bølgene et litt organisk utseende når lyden varierer. */
const waveWeights = [0.5, 0.78, 1, 0.72, 0.44];

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
  const engineLabel =
    voice.engine === "whisper"
      ? "Tale-til-tekst på serveren"
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
      <div className="voice-bar">
        <button
          type="button"
          className={`voice-bubble ${voice.listening ? "listening" : ""}`}
          aria-label={
            voice.listening ? "Stopp talestyring" : "Start talestyring"
          }
          aria-pressed={voice.listening}
          title={
            voice.listening
              ? "Stopp talestyring (Ctrl+Space)"
              : "Start talestyring (Ctrl+Space)"
          }
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
        >
          {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <span
          className={`voice-waves ${voice.listening ? "on" : ""} ${
            voice.meterActive ? "" : "fallback"
          }`}
          aria-hidden="true"
        >
          {waveWeights.map((weight, index) => (
            <i
              key={index}
              style={{
                transform: `scaleY(${Math.max(
                  0.14,
                  Math.min(1, voice.level * weight * 1.7),
                )})`,
              }}
            />
          ))}
        </span>
        {voice.engine === "whisper" && voice.microphones.length > 0 && (
          <select
            className="voice-mic-select"
            aria-label="Velg mikrofon"
            value={voice.microphoneId}
            onChange={(event) => voice.setMicrophoneId(event.target.value)}
          >
            <option value="">Standardmikrofon</option>
            {voice.microphones.map((microphone) => (
              <option key={microphone.id} value={microphone.id}>
                {microphone.label}
              </option>
            ))}
          </select>
        )}
        <form className="voice-manual" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="voice-manual-input">
            Skriv kommando
          </label>
          <input
            id="voice-manual-input"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="Si eller skriv øvelsene …"
            autoComplete="off"
          />
          <button type="submit" aria-label="Bruk kommando">
            Bruk
          </button>
        </form>
        <button
          className="icon-button small voice-close"
          aria-label="Lukk tale til program"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      <p className="voice-engine" title={voice.note || undefined}>
        Lydmotor: <strong>{engineLabel}</strong>
        {voice.note ? ` — ${voice.note}` : ""}
      </p>
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
