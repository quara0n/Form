import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  0: SpeechAlternative;
  isFinal: boolean;
  length: number;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent extends Event {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechErrorEvent extends Event {
  error?: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type DictationEngine = "checking" | "whisper" | "browser";

export interface Microphone {
  id: string;
  label: string;
}

export interface Dictation {
  engine: DictationEngine;
  listening: boolean;
  level: number;
  meterActive: boolean;
  transcript: string;
  interim: string;
  error: string;
  note: string;
  microphones: Microphone[];
  microphoneId: string;
  setMicrophoneId: (id: string) => void;
  refreshMicrophones: () => void;
  start: () => void;
  stop: () => void;
}

const silenceMs = 2500;

type AudioContextConstructor = typeof AudioContext;

function audioContextConstructor(): AudioContextConstructor | undefined {
  const scoped = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scoped.AudioContext ?? scoped.webkitAudioContext;
}

export function useDictation(onFinal: (transcript: string) => void): Dictation {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceRef = useRef<number | null>(null);
  const finalTextRef = useRef("");
  const meterRef = useRef<{
    context: AudioContext;
    frame: number;
  } | null>(null);
  const [engine, setEngine] = useState<DictationEngine>("checking");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [meterActive, setMeterActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [microphones, setMicrophones] = useState<Microphone[]>([]);
  const [microphoneId, setMicrophoneId] = useState("");
  const [probe, setProbe] = useState(0);

  const refreshMicrophones = useCallback(() => {
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) =>
        setMicrophones(
          devices
            .filter((device) => device.kind === "audioinput")
            .map((device, index) => ({
              id: device.deviceId,
              label: device.label || `Mikrofon ${index + 1}`,
            })),
        ),
      )
      .catch(() => setMicrophones([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/transcribe")
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          setEngine("browser");
          setNote(
            "Whisper-proxyen finnes bare i utviklingsserveren. Bruker nettleserens talegjenkjenning.",
          );
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as {
          ready?: boolean;
          error?: string;
          model?: string;
        };
        if (payload.ready) {
          setEngine("whisper");
          setNote(
            `Opptaket transkriberes av ${payload.model || "talemodellen"} på serveren.`,
          );
        } else {
          setEngine("browser");
          setNote(
            `${payload.error || "Whisper er ikke tilgjengelig."} Bruker nettleserens talegjenkjenning.`,
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEngine("browser");
          setNote(
            "Fant ingen transkriberingsserver. Bruker nettleserens talegjenkjenning.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [probe]);

  /**
   * Nøkkelen leses fra .env.openai ved hver forespørsel, så vi spør serveren
   * på nytt når vinduet får fokus. Da holder det å lime inn nøkkelen og gå
   * tilbake til nettleseren — ingen omstart eller omlasting.
   */
  useEffect(() => {
    function recheck() {
      if (document.visibilityState === "visible")
        setProbe((value) => value + 1);
    }
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, []);

  const clearSilence = useCallback(() => {
    if (silenceRef.current !== null) {
      window.clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  }, []);

  /**
   * Måler lydstyrken fra mikrofonen slik at ikonet kan vise små bølger mens
   * noen snakker. Visualiseringen er valgfri: uten Web Audio faller ikonet
   * tilbake til en rolig animasjon.
   */
  const stopMeter = useCallback(() => {
    const meter = meterRef.current;
    if (!meter) return;
    meterRef.current = null;
    window.cancelAnimationFrame(meter.frame);
    void meter.context.close().catch(() => undefined);
    setLevel(0);
    setMeterActive(false);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    const Constructor = audioContextConstructor();
    if (!Constructor) return;
    try {
      const context = new Constructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let smoothed = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / samples.length);
        smoothed = Math.max(rms * 3.4, smoothed * 0.84);
        setLevel(Math.min(1, smoothed));
        const meter = meterRef.current;
        if (meter) meter.frame = window.requestAnimationFrame(tick);
      };
      const meter = { context, frame: 0 };
      meterRef.current = meter;
      setMeterActive(true);
      meter.frame = window.requestAnimationFrame(tick);
    } catch {
      setMeterActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    clearSilence();
    stopMeter();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recognitionRef.current?.stop();
  }, [clearSilence, stopMeter]);

  const startBrowserSpeech = useCallback(() => {
    const Constructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Nettleseren støtter ikke talegjenkjenning. Bruk Chrome, eller skriv kommandoen i feltet.",
      );
      return;
    }
    finalTextRef.current = "";
    setTranscript("");
    setInterim("");
    setError("");
    const recognition = new Constructor();
    recognition.lang = "nb-NO";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let pending = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const value = result[0]?.transcript || "";
        if (result.isFinal)
          finalTextRef.current = `${finalTextRef.current} ${value}`.trim();
        else pending = `${pending} ${value}`.trim();
      }
      setTranscript(finalTextRef.current);
      setInterim(pending);
      clearSilence();
      silenceRef.current = window.setTimeout(
        () => recognition.stop(),
        silenceMs,
      );
    };
    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      setError(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Mikrofonen er ikke tillatt. Gi nettleseren tilgang og prøv igjen."
          : code === "no-speech"
            ? "Jeg hørte ingenting. Prøv en gang til."
            : code === "network"
              ? "Nettleserens talegjenkjenning får ikke kontakt med taletjenesten — den krever nettilgang til Google og hører derfor ingenting. Legg OpenAI-nøkkelen i .env.openai og kom tilbake hit, så bytter panelet til Whisper lokalt. Du kan også skrive kommandoen."
              : code === "audio-capture"
                ? "Fant ingen aktiv mikrofon. Sjekk at mikrofonen er tilkoblet og valgt i systeminnstillingene."
                : `Talegjenkjenningen stoppet (${code}). Prøv igjen, eller skriv kommandoen.`,
      );
    };
    recognition.onend = () => {
      clearSilence();
      stopMeter();
      setListening(false);
      setInterim("");
      const spoken = finalTextRef.current.trim();
      if (spoken) onFinal(spoken);
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setError("Kunne ikke starte mikrofonen. Prøv igjen.");
    }
  }, [clearSilence, onFinal, stopMeter]);

  const startWhisper = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Nettleseren gir ikke tilgang til lydopptak.");
      return;
    }
    setError("");
    setTranscript("");
    setInterim("Tar opp … trykk stopp når du er ferdig.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
      });
      streamRef.current = stream;
      refreshMicrophones();
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stopMeter();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setListening(false);
        setInterim("Transkriberer …");
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const payload = (await response.json().catch(() => ({}))) as {
            text?: string;
            error?: string;
          };
          if (!response.ok) {
            setError(payload.error || "Transkriberingen feilet.");
            setInterim("");
            return;
          }
          const spoken = (payload.text || "").trim();
          setTranscript(spoken);
          setInterim("");
          if (spoken) onFinal(spoken);
          else
            setError("Whisper hørte ingen ord. Prøv igjen nærmere mikrofonen.");
        } catch {
          setError("Fikk ikke kontakt med transkriberingsserveren.");
          setInterim("");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      startMeter(stream);
      setListening(true);
    } catch {
      setError(
        "Fikk ikke tilgang til mikrofonen. Sjekk systeminnstillingene og prøv igjen.",
      );
      setInterim("");
    }
  }, [microphoneId, onFinal, refreshMicrophones, startMeter, stopMeter]);

  const start = useCallback(() => {
    if (engine === "whisper") void startWhisper();
    else startBrowserSpeech();
  }, [engine, startBrowserSpeech, startWhisper]);

  useEffect(
    () => () => {
      clearSilence();
      recognitionRef.current?.abort();
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      stopMeter();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [clearSilence, stopMeter],
  );

  return {
    engine,
    listening,
    level,
    meterActive,
    transcript,
    interim,
    error,
    note,
    microphones,
    microphoneId,
    setMicrophoneId,
    refreshMicrophones,
    start,
    stop,
  };
}
