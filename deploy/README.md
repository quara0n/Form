# Utrulling av FormRehab

Appen er én Node-prosess som serverer både API-et og den bygde frontenden.
Den trenger en adresse pasientens telefon kan nå, og HTTPS for at mikrofon,
offline-bufring og «legg til på hjemskjermen» skal virke fullt ut.

## Det du må skaffe

1. **Domene** — for eksempel `formrehab.no`. Registreres hos en registrar.
2. **Et sted å kjøre** — velg én av veiene under.
3. **Nøkkel til tale-til-tekst** — legges i `.env.openai` eller som miljøvariabel
   `OPENAI_API_KEY` på serveren. Den skal aldri i git.

## Vei A: egen server med Docker (anbefalt for produksjon)

Alt ligger i `deploy/`. På serveren:

```sh
# 1. Domene peker til serverens IP (A-record hos registraren).
# 2. Kode og konfigurasjon på plass:
git clone <repo> /opt/formrehab && cd /opt/formrehab
cp deploy/.env.example deploy/.env   # fyll inn DOMAIN og OPENAI_API_KEY
# 3. Start:
docker compose -f deploy/docker-compose.yml up -d --build
```

Caddy henter HTTPS-sertifikat automatisk og fornyer det. Databasen ligger i
volumet `form-data`, så den overlever oppdateringer.

Oppdatering:

```sh
git pull && docker compose -f deploy/docker-compose.yml up -d --build
```

## Vei B: klinikkmaskinen med Cloudflare Tunnel

Ingen brannmuråpning, ingen portvideresending, og dataene blir liggende lokalt.
Dette er den billigste veien: ingen månedskostnad, bare domenet i året.

### Prøv i dag, uten konto og uten domene

```powershell
# 1. Bygg appen en gang:
node node_modules/vite/bin/vite.js build

# 2. Start serveren (lytter på nettverket, 0.0.0.0:8787):
$env:HOST="0.0.0.0"; node server/index.mjs

# 3. I et nytt vindu: gi den en midlertidig https-adresse
tools\cloudflared.exe tunnel --url http://127.0.0.1:8787
```

cloudflared skriver ut en adresse som `https://et-eller-annet.trycloudflare.com`.
Start serveren på nytt med `FORM_PUBLIC_URL` satt til den adressen, så peker
QR-kodene dit. Adressen er tilfeldig og forsvinner når vinduet lukkes, så den
er bare for testing.

### Fast ordning med eget domene

1. Legg domenet inn i Cloudflare (gratis plan) og pek navnetjenerne dit.
2. Lag en tunnel i Zero Trust → Networks → Tunnels, og kopier tokenet.
3. På klinikkmaskinen:

```sh
cloudflared service install <token>
```

4. Legg rutinen `formrehab.no → http://127.0.0.1:8787` i tunnelens
   Public Hostname.
5. Sett `FORM_PUBLIC_URL=https://formrehab.no` der serveren startes, slik at
   QR-kodene peker på domenet.

Med en navngitt tunnel får adressen fast oppføring i Cloudflare, og da kan den
stå på papir. Start serveren slik på klinikkmaskinen:

```powershell
$env:HOST="0.0.0.0"; $env:PORT="8787"; $env:FORM_SECURE_COOKIES="1"
$env:FORM_PUBLIC_URL="https://formrehab.no"
node server/index.mjs
```

## Miljøvariabler

| Variabel | Betydning |
| --- | --- |
| `HOST` / `PORT` | Hvor serveren lytter. `0.0.0.0` i container. |
| `FORM_PUBLIC_URL` | Adressen som delingslenker og QR-koder bygges fra. |
| `FORM_DATA_DIR` | Mappe for SQLite-databasen. |
| `FORM_SECURE_COOKIES` | Sett til `1` bak HTTPS. |
| `OPENAI_API_KEY` | Nøkkel til tale-til-tekst. |
| `FORMTALE_MODEL` | Standard `gpt-transcribe`. |

## Sikkerhetskopi

`node deploy/backup.mjs /mnt/backup` tar et konsistent bilde av databasen mens
serveren kjører. Legg den i cron og kopier filene et annet sted enn serveren.
Kjører du Docker, kan du kjøre samme kommando inne i containeren:

```sh
docker compose -f deploy/docker-compose.yml exec app node deploy/backup.mjs /data/backup
```

## Sjekk etter utrulling

```sh
curl -sS https://formrehab.no/api/health          # {"ok":true}
curl -sS https://formrehab.no/api/transcribe      # {"ready":true,...}
```

Åpne deretter appen, logg inn, lag et program, trykk forhåndsvisning, og skann
QR-koden med telefonen. Da skal logoen og øvelsene komme opp i nettleseren.

## Å utvikle videre mens appen er i drift

Det går helt fint å legge ut appen før den er ferdig. Fire ting endrer seg når
den først er i bruk, og alle er greie å håndtere:

1. **Dataene blir ekte.** Kjør `node deploy/backup.mjs` før hver oppdatering, og
   legg den i en planlagt oppgave daglig. Vil du teste uten å røre ekte data,
   start en egen instans med sin egen database:

   ```powershell
   $env:FORM_DATA_DIR="$PWD\server\data-dev"; $env:PORT="8790"
   node server/index.mjs
   ```

   Da kjører utviklingsutgaven på `http://127.0.0.1:8790`.

2. **QR-koder på papir er et løfte.** Så lenge domenet står fast, virker kodene.
   To ting må ikke gjøres: å rotere delingsnøkkelen for et program som allerede
   er delt ut, og å slette videofiler som lagrede programmer bruker. Da får
   pasienten en side uten video. Legg heller nye filer ved siden av.

3. **Endringer i programformatet trenger en migrering.** Programmene lagres med
   `schemaVersion`. Endrer vi strukturen, øker vi til 2 og skriver en liten
   migrering som kjøres over `server/data/form.db` før serveren starter.

4. **Oppdatering tar noen sekunder.** `git pull`, bygg, start serveren på nytt.
   Pasienter som har siden åpen, merker ingenting utenom et øyeblikk midt på
   dagen, så legg gjerne oppdateringer til etter arbeidstid i starten.

Anbefalt rekkefølge før de første pasientene får en QR-kode:

- Bestem om de AI-genererte videoene skal ut. Slettes de, må det skje *før*
  programmer som bruker dem deles ut.
- Slå på daglig sikkerhetskopi.
- Ta en `git tag` på versjonen som settes i drift, så den kan rulles tilbake.

## Slik oppdaterer du nettsiden

Én kommando på klinikkmaskinen:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\update.ps1
```

Den tar sikkerhetskopi av databasen, henter siste kode, installerer nye
avhengigheter bare hvis de er endret, bygger appen på nytt og starter serveren
og tunnelen. Tar noen sekunder når ingenting er endret, opp mot et minutt når
avhengighetene må installeres. Databasen røres ikke.

Innstillingene ligger i `deploy/.env.local` (ignorert av git). Der står port,
om det skal brukes midlertidig tunnel, og eventuelt tunnel-token og domene.

Vil du starte automatisk når maskinen slås på, legg inn en oppgave:

```powershell
schtasks /Create /TN FormRehab /SC ONLOGON /RL LIMITED ^
  /TR "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\sti\til\Form\deploy\start.ps1"
```

Rull tilbake til en tidligere versjon:

```powershell
git tag                      # se hvilke versjoner som er merket
git checkout <tag>           # bytt til den du vil tilbake til
powershell -File deploy\update.ps1 -SkipPull
```

Merk: en midlertidig tunnel får ny adresse hver gang den starter, og da slutter
QR-koder som allerede er skrevet ut å virke. Med navngitt tunnel på eget domene
er adressen fast, og oppdateringer blir usynlige for pasientene.
