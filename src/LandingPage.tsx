import {
  ArrowRight,
  BookOpen,
  Mic2,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { FormBrand } from "./components/FormBrand";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a href="/" aria-label="Form Rehab forside" className="landing-logo">
          <FormBrand />
        </a>
        <nav aria-label="Hovedmeny">
          <a href="#slik-fungerer-det">Slik fungerer det</a>
          <a className="landing-login" href="/app">
            Logg inn
          </a>
        </nav>
      </header>
      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">
              Treningsprogrammer
              <br />
              som er enkle å følge.
            </h1>
            <p>
              Finn øvelser, tilpass programmet og del det med pasienten – med
              video som viser veien.
            </p>
            <div className="landing-actions">
              <a className="landing-primary" href="/app">
                Åpne Form Rehab <ArrowRight size={20} />
              </a>
              <a className="landing-watch" href="#slik-fungerer-det">
                <span>
                  <Play size={15} fill="currentColor" />
                </span>
                Se hvordan det fungerer
              </a>
            </div>
          </div>
          <div className="landing-art">
            <img
              className="landing-art-source"
              src="/brand/form-rehab-homepage.png"
              alt="Øvelse på blå matte med forhåndsvisning av treningsprogram og video"
            />
          </div>
        </section>
        <section
          id="slik-fungerer-det"
          className="landing-steps"
          aria-label="Slik fungerer det"
        >
          <article>
            <span className="landing-step-icon">
              <BookOpen size={24} />
            </span>
            <div>
              <h2>Finn øvelser</h2>
              <p>
                Søk i øvelsesbiblioteket med video og tydelige beskrivelser.
              </p>
            </div>
          </article>
          <article>
            <span className="landing-step-icon">
              <SlidersHorizontal size={24} />
            </span>
            <div>
              <h2>Tilpass programmet</h2>
              <p>Sett sammen og juster øvelser etter behov.</p>
            </div>
          </article>
          <article>
            <span className="landing-step-icon">
              <Mic2 size={24} />
            </span>
            <div>
              <h2>Si eller skriv</h2>
              <p>
                Beskriv øvelser og dosering, og legg treffene rett i programmet.
              </p>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
