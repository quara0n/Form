import { formatParameter, type Programme } from "../../domain/programme";
export function ProgrammeHandout({
  programme,
  shareUrl = null,
}: {
  programme: Programme;
  shareUrl?: string | null;
}) {
  const shareToken = shareUrl?.split("/p/")[1] ?? null;
  return (
    <div className="handout">
      <header>
        <div className="handout-brand-group">
          <img
            className="handout-logo"
            src="/brand/gps-helse.png"
            alt="GPS Helse"
          />
          <div className="handout-brand">
            form<span> / rehab</span>
          </div>
        </div>
        <span>YOUR MOVEMENT PROGRAMME</span>
      </header>
      <h1>{programme.title}</h1>
      {shareUrl && shareToken && (
        <div className="handout-share">
          <img
            className="handout-qr"
            src={`/api/shared/${shareToken}/qr.svg`}
            alt=""
          />
          <div>
            <strong>Se hvordan øvelsene utføres</strong>
            <span>Skann QR-koden med telefonen, eller skriv {shareUrl}</span>
          </div>
        </div>
      )}
      {programme.instructions && (
        <p className="handout-intro">{programme.instructions}</p>
      )}
      <div>
        {programme.items.map((item, index) => (
          <article key={item.id} className="handout-exercise">
            <img src={item.exercise.poster} alt={item.exercise.name} />
            <div>
              <span className="handout-number">
                {String(index + 1).padStart(2, "0")} / {item.exercise.equipment}
              </span>
              <h2>{item.exercise.name}</h2>
              <p>{item.exercise.description}</p>
              <ul>
                {item.parameters.map((param) => {
                  const value = formatParameter(param);
                  return value ? <li key={param.id}>{value}</li> : null;
                })}
              </ul>
              {item.notes && <p className="handout-note">{item.notes}</p>}
              {item.exercise.license === "CC BY 3.0" && (
                <small className="handout-credit">
                  Video: {item.exercise.credit} ·{" "}
                  <a href="https://creativecommons.org/licenses/by/3.0/">
                    CC BY 3.0
                  </a>
                </small>
              )}
            </div>
          </article>
        ))}
      </div>
      <footer>Form / A little movement, thoughtfully prescribed.</footer>
    </div>
  );
}
