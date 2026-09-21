# Form / rehab

An exercise-library and programme builder for MSK clinicians, with a patient-facing
web view. Build a programme from the catalogue, prescribe sets, reps, duration,
load, holds, rest, frequency, side, tempo or named custom parameters, print it,
and let the patient scan a QR code to watch each exercise on their own phone.

## What the system consists of

| Part | Where | What it does |
| --- | --- | --- |
| Clinician app | `src/` — React, TypeScript, Vite | Library, programme builder, voice to programme, print |
| Server | `server/` — Node, no framework | Accounts, programmes per user, sharing, transcription |
| Database | SQLite via `FORM_DATA_DIR` | Programmes, accounts, sessions, audit log |
| Patient view | `/p/<token>` | Opens without login, shows the programme with videos |
| Print | QR code on the handout | Points at the address in `FORM_PUBLIC_URL` |
| Deployment | `deploy/` | Start, stop, update, backups, Docker, systemd |

Deep dive: `docs/teknisk-oversikt.md` (architecture, API, data model, security)
and `deploy/README.md` (operations, backups, domain).

## Run locally

On the clinic machine the services are managed by the scripts in `deploy/`:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\start.ps1    # server, tunnel, app
powershell -ExecutionPolicy Bypass -File deploy\stop.ps1     # stop everything
powershell -ExecutionPolicy Bypass -File deploy\update.ps1   # backup, pull, build, restart
```

Settings live in `deploy/.env.local` (ignored by git): port, the Node binary in
`NODE_EXE`, the data directory in `FORM_DATA_DIR`, and the passphrase for
encrypted backups. `node` is not on the system PATH on this machine — use
`NODE_EXE`.

For plain development, with Node 22 or newer:

```sh
npm ci
npm run dev -- --port 5173      # app on 5173, API on 8787
node server/index.mjs           # the API and the built app
```

## Storage and accounts

Signed in, programmes are stored on the server and follow the account rather
than the browser. The UI reports pending and failed saves, keeps unsaved edits,
and offers retry or save-as-copy recovery. Concurrent edits are checked against
revisions, so two devices cannot overwrite each other. Without a reachable
server the app falls back to local storage in the browser and says so.

Sharing a programme creates an unguessable link (`/p/<token>`) that expires
after `FORM_SHARE_DAYS`, 180 days by default. Rotating the key kills the old
link. The patient view contains the programme only — never account details.

Every account action is written to an audit log: sign-in, failed sign-in,
sign-out, programme saved or deleted, link created or rotated, and
transcription used. The log holds who and when, never the programme content.

## Security

Passwords are hashed with scrypt and a per-user salt, compared in constant
time. Sessions are 32 random bytes in an HttpOnly, SameSite=Lax cookie.
Sign-in is rate limited per client address, and the transcription endpoint
requires a session so nobody can spend the API quota. All responses carry a
content security policy, frame denial and nosniff. The server listens on the
clinic machine only; a Cloudflare tunnel provides HTTPS without opening any
inbound port. Backups are encrypted with AES-256-GCM — see
`docs/nodprosedyre-sikkerhetskopi.md`.

## Voice to programme

In the programme builder, the microphone button or **Ctrl+Space** opens Voice to programme. Say the exercises and the dosage, for example «Brystpress, nedtrekk, beinpress og flyes 3 x 10 reps, 2 min pause mellom settene», and the builder fills in with the matched exercises, sets, reps and rest. A typed command field mirrors the same parser for browsers without speech recognition and for testing. Speech recognition needs Chrome and microphone permission; the parser also runs offline on any typed text.

Spoken names do not have to be spelled exactly. The matcher folds Norwegian sound-alikes (bein/ben, ø/o, ei/e, kj/tj, doubled letters), searches the whole sentence for exercise names, understands dosage words such as «sett», «reps», «ganger», «pause» and «sekunder», knows that «øvelsene» or «mellom settene» applies the dose to every exercise, and marks uncertain matches in the result list.

Two engines turn speech into text. The server holds the OpenAI key and calls
`gpt-transcribe` with `language=no`, a short Norwegian prompt and the catalogue's
exercise names as keywords, so domain terms come through. Without a key the
panel falls back to the browser's own speech recognition, which needs network
and a secure context. Audio is sent to OpenAI for transcription and costs about
$0.0045 per minute.

## Catalogue and scope

The library holds 43 exercises: 12 openly licensed videos from Wikimedia
Commons and 31 clips produced in-house. The produced clips carry a note where
the execution deviates from the reference, and are marked in the UI. The
catalogue demonstrates the workflow and is weighted towards strength and
rehabilitation exercises; it is not a clinically validated selection.
Clinicians choose suitability and dosage, and no dosage is prefilled.

This is a pilot. It is meant for non-identifying programme names and notes.
Programmes are stored on the server in the clinic, patient links expire, and
the audio used for transcription leaves the machine only through the OpenAI
API.

## Tests

```sh
NODE_EXE node_modules\typescript\bin\tsc -b            # types
NODE_EXE --test server/app.test.mjs                    # API
NODE_EXE node_modules\vitest\vitest.mjs run src        # units
NODE_EXE node_modules\@playwright\test\cli.js test     # end to end
```

Browser tests use an installed Google Chrome and start their own server on port
5273. They cover prescribing, save and reopen, reordering, removal, validation,
video failure, keyboard focus, printing, mobile layout, the imported machine
collection and the voice command flow. Unit tests cover parameter semantics, the
spoken-command parser and storage integrity. TypeScript provides static checking;
there is no separate linter.

## Exercise content

To produce new exercise videos through MiniMax H3 Max, follow [MiniMax setup](docs/minimax-setup.md). Start with `npm run video:doctor` and `npm run video:plan`; both are free local checks. Paid generation requires an explicit `--submit` flag and budget.

The catalogue is in `src/data/exercises.json`; matching videos and posters are in `public/exercises`. See [media rights](docs/media-rights.md) for sources, attribution and licences. Video preview and print handouts retain attribution. No ExorLive assets are included.

Form-produced clips live in `src/data/generated-exercises.json` with media under `public/media/generated/<id>/`. Approved MiniMax attempts are imported with `node scripts/import-approved.mjs`, which reads the run state, copies the approved `video.mp4` and `poster.jpg`, and names entries from `video-production/catalogue-overrides.json`.

`scripts/download-media.mjs` downloads the documented originals. With the local server running, `node scripts/make-posters.mjs` regenerates matching video stills using Chrome.
