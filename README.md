# Form / rehab

A local exercise-library and programme-builder MVP for MSK clinicians. Search 12 openly licensed exercise videos, add independent exercise instances, and prescribe sets, reps, duration, load, holds, rest, frequency, side, tempo, or named custom parameters. Reorder, duplicate and remove exercises; preview and print a programme or save it as PDF through the browser.

## Run locally

Requires Node.js 22 and npm.

```sh
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173. Use this same address when returning: storage belongs to the browser profile and origin, including the port.

## Storage and scope

Programmes autosave to IndexedDB on this device. The UI reports pending and failed saves, retains unsaved edits, and offers retry or save-as-copy recovery. Concurrent edits are checked against saved revisions. My programmes supports reopening, duplication and confirmed deletion.

## Voice to programme

In the programme builder, the microphone button or **Ctrl+Space** opens Voice to programme. Say the exercises and the dosage, for example «Brystpress, nedtrekk, beinpress og flyes 3 x 10 reps, 2 min pause mellom settene», and the builder fills in with the matched exercises, sets, reps and rest. A typed command field mirrors the same parser for browsers without speech recognition and for testing. Speech recognition needs Chrome and microphone permission; the parser also runs offline on any typed text.

Spoken names do not have to be spelled exactly. The matcher folds Norwegian sound-alikes (bein/ben, ø/o, ei/e, kj/tj, doubled letters), searches the whole sentence for exercise names, understands dosage words such as «sett», «reps», «ganger», «pause» and «sekunder», knows that «øvelsene» or «mellom settene» applies the dose to every exercise, and marks uncertain matches in the result list.

Two engines turn speech into text. With the local developer server and an OpenAI key in `.env.openai`, the page records audio and posts it to `/api/transcribe`; the dev server forwards it to Whisper (`whisper-1`, language `no`, prompted with the catalogue's Norwegian exercise names) so the key never reaches the browser. The panel names the active engine, and offers a microphone picker when Whisper is in use. Without a key, or in a production build where the proxy does not exist, the panel falls back to the browser's Web Speech API. Whisper sends the recorded audio to OpenAI and costs roughly $0.006 per minute.

This version is for evaluation with non-identifying programmes. It has no accounts, patient records, server, cloud sync or patient-sharing service. Clearing browser data removes saved programmes. Video files are bundled locally; first-time offline installation and installable-app support are outside this version.

The starter catalogue demonstrates the workflow and is weighted towards strength exercises. It is not a comprehensive MSK catalogue or a clinically validated selection. Clinicians choose suitability and dosage; no dosage is prefilled. The proposed five-exercise programme in under three minutes still needs a clinician usability session.

## Validate

```sh
npm test
npm run build
npm run format:check
npm run test:e2e
```

Browser tests use an installed Google Chrome and start the local server automatically. They cover prescribing, save/reopen, reordering, removal/undo, validation, video failure, keyboard focus, printing, mobile layout, the imported machine collection and the voice command flow. Unit tests cover parameter semantics, the spoken-command parser and IndexedDB integrity, failures and conflicts. TypeScript provides static checking; no separate lint configuration is installed.

## Exercise content

To produce new exercise videos through MiniMax H3 Max, follow [MiniMax setup](docs/minimax-setup.md). Start with `npm run video:doctor` and `npm run video:plan`; both are free local checks. Paid generation requires an explicit `--submit` flag and budget.

The catalogue is in `src/data/exercises.json`; matching videos and posters are in `public/exercises`. See [media rights](docs/media-rights.md) for sources, attribution and licences. Video preview and print handouts retain attribution. No ExorLive assets are included.

Form-produced clips live in `src/data/generated-exercises.json` with media under `public/media/generated/<id>/`. Approved MiniMax attempts are imported with `node scripts/import-approved.mjs`, which reads the run state, copies the approved `video.mp4` and `poster.jpg`, and names entries from `video-production/catalogue-overrides.json`.

`scripts/download-media.mjs` downloads the documented originals. With the local server running, `node scripts/make-posters.mjs` regenerates matching video stills using Chrome.
