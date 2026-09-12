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

This version is for evaluation with non-identifying programmes. It has no accounts, patient records, server, cloud sync or patient-sharing service. Clearing browser data removes saved programmes. Video files are bundled locally; first-time offline installation and installable-app support are outside this version.

The starter catalogue demonstrates the workflow and is weighted towards strength exercises. It is not a comprehensive MSK catalogue or a clinically validated selection. Clinicians choose suitability and dosage; no dosage is prefilled. The proposed five-exercise programme in under three minutes still needs a clinician usability session.

## Validate

```sh
npm test
npm run build
npm run format:check
npm run test:e2e
```

Browser tests use an installed Google Chrome and start the local server automatically. They cover prescribing, save/reopen, reordering, removal/undo, validation, video failure, keyboard focus, printing, and mobile layout. Unit tests cover parameter semantics and IndexedDB integrity, failures and conflicts. TypeScript provides static checking; no separate lint configuration is installed.

## Exercise content

The catalogue is in `src/data/exercises.json`; matching videos and posters are in `public/exercises`. See [media rights](docs/media-rights.md) for sources, attribution and licences. Video preview and print handouts retain attribution. No ExorLive assets are included.

`scripts/download-media.mjs` downloads the documented originals. With the local server running, `node scripts/make-posters.mjs` regenerates matching video stills using Chrome.
