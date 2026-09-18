import { useEffect, useState } from "react";
import { Leaf, LoaderCircle, Play } from "lucide-react";
import { formatParameter, type Programme } from "../../domain/programme";

type State =
  | { status: "loading" }
  | { status: "ready"; programme: Programme }
  | { status: "missing" }
  | { status: "expired" };

/**
 * Pasientvisningen: åpnes fra lenken eller QR-koden på papiret, uten innlogging.
 * Den viser programmet og lar pasienten se hvordan øvelsene utføres.
 */
export function PatientProgramme({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/shared/${token}`);
        if (cancelled) return;
        if (response.status === 410) {
          setState({ status: "expired" });
          return;
        }
        if (!response.ok) {
          setState({ status: "missing" });
          return;
        }
        const payload = (await response.json()) as { programme: Programme };
        setState({ status: "ready", programme: payload.programme });
      } catch {
        if (!cancelled) setState({ status: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading")
    return (
      <div className="patient-screen">
        <p className="auth-loading">
          <LoaderCircle size={18} className="spinning" /> Henter programmet …
        </p>
      </div>
    );

  if (state.status === "missing" || state.status === "expired")
    return (
      <div className="patient-screen">
        <div className="patient-card patient-empty">
          <h1>
            {state.status === "expired"
              ? "Lenken har utløpt"
              : "Fant ikke programmet"}
          </h1>
          <p>
            {state.status === "expired"
              ? "Av sikkerhetshensyn er lenker bare gyldige en periode. Ta kontakt med klinikken, så får du en ny."
              : "Lenken kan være trukket tilbake eller skrevet feil. Be klinikken om en ny lenke."}
          </p>
        </div>
      </div>
    );

  const { programme } = state;
  return (
    <div className="patient-screen">
      <header className="patient-top">
        <img
          className="patient-logo"
          src="/brand/gps-helse.png"
          alt="GPS Helse"
        />
        <span className="patient-badge">
          <Leaf size={13} /> Treningsprogram
        </span>
      </header>
      <main className="patient-main">
        <h1>{programme.title || "Treningsprogram"}</h1>
        <p className="patient-count">
          {programme.items.length} øvelse
          {programme.items.length === 1 ? "" : "r"}
        </p>
        {programme.instructions && (
          <p className="patient-intro">{programme.instructions}</p>
        )}
        <ol className="patient-list">
          {programme.items.map((item, index) => {
            const values = item.parameters
              .map((parameter) => formatParameter(parameter))
              .filter(Boolean);
            return (
              <li key={item.id} className="patient-item">
                <span className="patient-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2>{item.exercise.name}</h2>
                {failed.has(item.id) ? (
                  <p className="patient-video-fallback">
                    <Play size={16} /> Videoen kunne ikke lastes her. Spør
                    klinikken om utførelsen.
                  </p>
                ) : (
                  <video
                    className="patient-video"
                    src={item.exercise.video}
                    poster={item.exercise.poster}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() =>
                      setFailed((previous) => new Set(previous).add(item.id))
                    }
                  />
                )}
                <p className="patient-description">
                  {item.exercise.description}
                </p>
                {values.length > 0 && (
                  <ul className="patient-dosage">
                    {values.map((value, valueIndex) => (
                      <li key={valueIndex}>{value}</li>
                    ))}
                  </ul>
                )}
                {item.notes && <p className="patient-note">{item.notes}</p>}
              </li>
            );
          })}
        </ol>
        <footer className="patient-foot">
          <p>
            Gjennomfør øvelsene slik de er avtalt med klinikken. Ta kontakt hvis
            noe gjør vondt.
          </p>
          <p className="patient-hint">
            Vil du ha programmet lett tilgjengelig? Åpne menyen i nettleseren og
            velg «Legg til på hjemskjermen».
          </p>
        </footer>
      </main>
    </div>
  );
}
