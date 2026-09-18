# FormRehab — hva som er bygget

Denne filen beskriver løsningen på tre nivåer: en analogi, en enkel teknisk
innføring, og den detaljerte tekniske beskrivelsen.

## 1. Analogien

Tenk på det som en liten klinikk:

| I klinikken | I løsningen |
| --- | --- |
| Behandlingsrommet med benk og utstyr | Appen du ser i nettleseren |
| Låst arkivskap på bakrommet | Serveren og databasen |
| Nøkkelkortet ditt | Innloggingen |
| Journalene i skapet | Programmene som er lagret |
| Kortet du gir pasienten: «Her ser du øvelsene dine» | Pasientlenken og QR-koden |
| Hemmelig kode på kortet som ingen kan gjette | Delingsnøkkelen i lenken |
| Gateadressen til klinikken | Domenet |
| Forsseglet konvolutt | HTTPS |
| Kopi av arkivet et annet sted | Sikkerhetskopien |
| Vaktmesteren som bytter utstyr etter stengetid | Oppdateringsskriptet |

## 2. Enkel teknisk innføring

Løsningen har to deler. Den ene er nettsiden du jobber i, som kjører i
nettleseren. Den andre er et lite program på klinikkmaskinen, som tar imot
innlogging, lagrer programmene og lager pasientlenker.

Når du oppretter et program, havner det i en databasefil på maskinen. Når du
skriver ut, lager serveren en QR-kode som peker på en egen side for pasienten.
Den siden krever ingen innlogging og viser bare det ene programmet, med video av
hver øvelse.

Lyd fra mikrofonen sendes til serveren, som videresender den til OpenAI for
tale-til-tekst. Nøkkelen ligger på serveren og kommer aldri ut i nettleseren.

Maskinen er ikke åpnet mot internett. I stedet går all trafikk gjennom en
Cloudflare-tunnel, som gir https uten brannmurhull. Pasientdataene ligger på
lokal disk utenfor OneDrive, og det tas daglig sikkerhetskopi klokka 20.

Appen har sin egen Node-versjon, så den ikke er avhengig av utviklerverktøy.
Én kommando oppdaterer nettsiden.

## 3. Detaljert teknisk beskrivelse

### Byggeklosser

| Del | Teknologi |
| --- | --- |
| Grensesnitt | React 19, TypeScript, Vite 6 |
| Server | Node 24, `node:http`, ingen rammeverk |
| Database | SQLite via `node:sqlite` |
| QR | `qrcode` (CommonJS, hentes med `require`) |
| Tale-til-tekst | OpenAI `gpt-transcribe` |
| Tunnelen | `cloudflared` 2026.9.1, i `tools/` |
| Tester | Vitest (enhet), `node:test` (API), Playwright (e2e) |

### Mappestruktur

| Mappe | Innhold |
| --- | --- |
| `src/` | Frontenden: bibliotek, programbygger, utskrift, tale, pasientvisning |
| `server/` | API, database, innlogging, QR, transkribering |
| `deploy/` | Start, stopp, oppdatering, backup, Docker-oppsett |
| `public/` | Logo, ikoner, manifest, tjenestearbeider |
| `tests/` | Playwright-tester |

### API

| Metode og sti | Krever innlogging | Gjør |
| --- | --- | --- |
| `GET /api/health` | nei | Livstegn |
| `POST /api/auth/register` | nei | Oppretter konto, setter sesjonskake |
| `POST /api/auth/login` | nei | Logger inn |
| `POST /api/auth/logout` | ja | Sletter sesjonen |
| `GET /api/auth/me` | nei | Sier hvem du er, eller 401 |
| `GET /api/programmes` | ja | Lister dine programmer |
| `PUT /api/programmes/:id` | ja | Lagrer med versjonssjekk, 409 ved konflikt |
| `DELETE /api/programmes/:id?revision=n` | ja | Sletter med versjonssjekk |
| `POST /api/programmes/:id/share` | ja | Lager eller henter pasientlenke |
| `DELETE /api/programmes/:id/share` | ja | Roterer nøkkelen, gammel lenke dør |
| `GET /api/shared/:token` | nei | Programmet bak en delingslenke |
| `GET /api/shared/:token/qr.svg` | nei | QR-koden som SVG |
| `GET /api/transcribe` | nei | Om talemodellen er klar |
| `POST /api/transcribe` | nei | Tar imot lyd, svarer med tekst |

### Datamodell

```
users       (id, email unik, password_hash, password_salt, created_at)
sessions    (token primærnøkkel, user_id, created_at, expires_at)
programmes  (user_id, id, revision, updated_at, payload JSON, share_token)
            primærnøkkel (user_id, id)
```

`payload` er hele programmet med `schemaVersion: 1`, øvelser og parametere.
`revision` gir optimistisk låsing: to enheter kan ikke overskrive hverandre
uten å få 409.

### Sikkerhet

- Passord: scrypt med 16 byte salt per bruker, 64 byte nøkkel, `timingSafeEqual`.
- Sesjon: 32 tilfeldige byte, `HttpOnly`, `SameSite=Lax`, 30 dager, slettes ved
  utlogging. `FORM_SECURE_COOKIES=1` bak https.
- Hastighetsgrense: 30 forsøk per 10 minutter, per klientadresse og handling.
  Bruker `CF-Connecting-IP` når trafikken kommer fra tunnelen.
- Dataskille: alle spørringer er bundet til innlogget bruker; testet på tvers.
- Delingslenke: 192 tilfeldige bit, viser bare ett program, ingen konto.
- Hemmeligheter: OpenAI-nøkkelen ligger på serveren.
- Hoder: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
- Ingen åpne innkommende porter; tunnelen går utenfra og inn.
- Interne feil svarer med generell melding.

### Tale-til-tekst

Nettleseren spiller inn med `MediaRecorder` (webm/opus) og sender lyden til
serveren. Serveren kaller `https://api.openai.com/v1/audio/transcriptions` med
`model=gpt-transcribe`, `language=no`, en kort norsk prompt og øvelsesnavnene
frekvensert som `keywords`. Prisen er omtrent $0,0045 per minutt, altså rundt
$0,0007 for en ti sekunders kommando. Uten nøkkel faller appen tilbake til
nettleserens egen talegjenkjenning, som krever nettilgang til Google og en
sikker kontekst.

### Pasientvisning og utskrift

Ruten `/p/<token>` rendres uten innlogging. Siden henter `/api/shared/<token>`
og viser GPS Helse-logoen, programnavn, antall øvelser og hver øvelse med video,
beskrivelse, dosering og notater. Utskriften får en QR-kode hentet fra
`/api/shared/<token>/qr.svg`. Adressen i QR-koden kommer fra `FORM_PUBLIC_URL`,
ellers maskinens nettverksadresse hvis serveren lytter på nettverket, ellers
forespørselens egen adresse.

### Nett og domene

- Utvikling: Vite på 5173, som videresender `/api` til 127.0.0.1:8787.
- Drift på klinikkmaskinen: Node serverer både API og den bygde appen på 8787,
bundet til 127.0.0.1. `cloudflared` gir https uten brannmuråpning.
- Alternativ på egen server: `Dockerfile` og `deploy/docker-compose.yml` med
Caddy, som henter Let's Encrypt-sertifikat automatisk.
- Fast adresse forutsetter eget domene og en navngitt tunnel. En midlertidig
tunnel får ny adresse ved hver omstart, og da slutter utskrevne QR-koder å
virke.

### Drift på maskinen

| Fil | Gjør |
| --- | --- |
| `deploy/start.ps1` | Starter server og tunnel, leser `deploy/.env.local` |
| `deploy/stop.ps1` | Stopper tjenestene trygt |
| `deploy/update.ps1` | Backup, stopp, hent kode, bygg, start |
| `deploy/backup.mjs` | Konsistent kopi av databasen mens den kjører |
| `deploy/backup-task.ps1` | Kalles av oppgaven `FormRehabBackup` klokka 20 |

Egen Node ligger i `C:\Users\post\FormRehab\runtime`, data i
`C:\Users\post\FormRehab\data`, sikkerhetskopier i
`C:\Users\post\FormRehab\backups` (fjorten nyeste beholdes).

### Testing

21 enhetstester, 16 API-tester og 15 e2e-tester. I tillegg er hele
pasientkjeden simulert: programmet skrives ut, QR-koden dekodes som en telefon
ville gjort, og den dekodede adressen åpnes i et telefonmål for å bekrefte logo,
øvelser og avspillbare videoer.

### Gjenstår

- Domene og navngitt tunnel, slik at adressen står fast.
- Databehandleravtale med OpenAI, og avklaring av behandlingsansvar.
- Utløpsdato på pasientlenker.
- Revisjonslogg, glemt passord, e-postbekreftelse og to-faktor.
- Kryptert sikkerhetskopi utenfor maskinen, og BitLocker på disken.
- Beslutning om de AI-genererte videoene skal ut av biblioteket.
