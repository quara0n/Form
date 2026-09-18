# Neste steg: fra klinikkmaskin til eget domene

Appen kjører i dag på klinikkmaskinen med en midlertidig Cloudflare-adresse.
Den virker, men adressen er tilfeldig og skifter ved hver omstart. Skal QR-koder
på papir virke over tid, må adressen være fast.

## Steg 1 — domene (deg, ca. 15 minutter, 100–200 kr i året)

`formrehab.com` er opptatt. `formrehab.no`, `.app`, `.net` og `.io` hadde ingen
navnetjener-oppføring sist vi sjekket, så de ser ledige ut.

- Registrer domenet hos en registrar du stoler på. For `.no` må det være en
  registrar som er godkjent av Norid.
- Velg hvem som skal stå som registrant: deg eller GPS Helse AS.

## Steg 2 — Cloudflare (deg, ca. 10 minutter, gratis)

1. Lag konto på cloudflare.com og legg inn domenet.
2. Bytt navnetjenerne hos registraren til de Cloudflare oppgir. Det tar noen
   timer før det slår igjennom.
3. Gå til Zero Trust → Networks → Tunnels, lag en tunnel, og kopier tokenet.
4. Legg inn en Public Hostname i tunnelen: domenet ditt → `http://127.0.0.1:8787`.

## Steg 3 — jeg setter det opp (ca. 30 minutter)

Når jeg har tokenet og domenet:

- Legger `FORM_TUNNEL_TOKEN` og `FORM_PUBLIC_URL=https://dittdomene.no` i
  `deploy/.env.local`, og setter `FORM_SECURE_COOKIES=1`.
- Installerer `cloudflared` som tjeneste, så tunnelen starter av seg selv.
- Legger inn en oppgave som starter serveren ved pålogging, så alt kommer opp
  etter en omstart uten at noen gjør noe.
- Verifiserer: helsesjekk mot domenet, innlogging, lagre program, skanne QR-koden
  med telefon og se pasientsiden.

Etter dette peker alle nye QR-koder på det faste domenet, og oppdateringer blir
usynlige for pasientene.

## Steg 4 — før de første pasientene (sammen)

- Databehandleravtale med OpenAI for lyden som transkriberes, og med Cloudflare
  for trafikken. Begge har standardavtaler som godtas i deres egne grensesnitt.
- Bekreft at behandlingsansvarlig er GPS Helse, og at ingen pasientidentifiserende
  opplysninger skrives i programnavn eller notater.
- Kort informasjonsskriv til pasienten om hva lenken er og hvor lenge den varer.

## Steg 5 — når appen skal leve uten klinikkmaskinen (valgfritt senere)

Tunnelløsningen er billigst, men krever at maskinen står på. Skal appen være
tilgjengelig hele døgnet uavhengig av maskinen, brukes serverveien som allerede
er ferdig skrevet: `Dockerfile` og `deploy/docker-compose.yml` med Caddy, som
henter HTTPS-sertifikat automatisk. Det koster 50–100 kr i måneden for en liten
maskin i EU.
