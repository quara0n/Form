# MiniMax: first video batch

The local connector is ready. No paid API calls have been made. Model: MiniMax-H3-Max, five seconds, 768P by default. The video pipeline removes audio tracks, validates duration and produces a poster. The API key never enters the rehab browser app.

## What you need to do

1. Open [MiniMax Open Platform](https://platform.minimax.io/), create/sign into your account and enable **pay-as-you-go** billing. Use an ordinary Open Platform API key, not a Token Plan subscription key. Check account access to H3 Max and the current rate before funding.
2. Open the prepared `.env.minimax` file and put your key after `MINIMAX_API_KEY=`. On another checkout, first copy `.env.minimax.example` to `.env.minimax`. This file is ignored by Git. Do not paste the key into chat, a prompt, or the browser console.
3. Run `npm run video:doctor`. It checks whether a key is configured and the local video tools exist; it does not authenticate or spend money.
4. Review `video-production/pilot.json`. It contains **one draft bridge prompt**, not a selected 100-exercise catalogue. The loop band is around the thighs above the knees. Edit this if you mean a different movement.
5. Run `npm run video:plan`. This validates the manifest and reports the estimated cost without any API call.

PowerShell setup:

```powershell
if (-not (Test-Path .env.minimax)) { Copy-Item .env.minimax.example .env.minimax }
notepad .env.minimax
npm run video:doctor
npm run video:plan
```

The copy command should only be used before a real key file exists; do not overwrite an existing configuration.

## Optional starting image

Leave `firstFrame` empty for text-to-video. To animate a specific start pose, place a PNG/JPEG/WebP in `video-production/references/` and set, for example, `"firstFrame": "references/bridge.png"` in the manifest. Paths are relative to the manifest. The connector validates size and dimensions, then sends the image to MiniMax as a data URI. No public image hosting is required. Image-to-video takes its aspect ratio from that image: prepare a landscape image if you want a landscape video.

## Start paid generation only when ready

```powershell
npm run video:run -- --submit --budget 2
```

Without `--submit`, run is a dry run. `--budget` is the cumulative estimated USD ceiling for this manifest's local queue, including previous, failed and uncertain reservations. It is not a provider-enforced account cap. Different manifests have separate queues. Rates are estimates checked on 2026-09-13: $0.40 per 768P five-second clip, $0.25 at 480P. The script preflights the entire set of new jobs against the ceiling before submission. Reconfirm provider prices before a paid run.

The runner keeps at most two jobs in flight and polls every ten seconds. It stops after thirty minutes, preserving task IDs for resumption. API/poll/download errors stop the run with the local state intact; restarting queries known jobs instead of paying for them again. There is no promise about actual provider latency or account concurrency; a restricted account may reject submission.

```powershell
npm run video:sync
npm run video:review
```

Sync checks known jobs once and downloads successes. Review prints the absolute path to `review.html`; open it in your browser. Outputs and state are under `video-production/runs/<queue-id>/`. Each completed job has `original.mp4`, silent `video.mp4` and `poster.jpg`. Review the complete movement before marking approval:

```powershell
node scripts/minimax.mjs approve --id bridge-band-v1
```

Approval records your decision; it does not automatically modify the clinic catalogue. The approved assets are ready for a separate import into the rehab library.

## Batches, recovery and spending

- Add exercises to the manifest with unique IDs. A changed prompt/image/settings requires a new ID such as `bridge-band-v2`. Keep submitted entries unchanged; their fingerprints prevent accidental reuse with different content.
- Select another manifest with `--manifest video-production/another-batch.json` on each command.
- A failed/rejected clip is never automatically regenerated. Inspect it and deliberately queue a new version.
- If a create request times out, the provider may still have accepted it. The job remains `submission-uncertain`, reserves budget, and blocks further paid submissions. Find its actual task ID in the MiniMax console, then use `node scripts/minimax.mjs attach --id bridge-band-v1 --task TASK_ID`. Match the prompt/time in the console before attaching. If acceptance cannot be resolved, stop and investigate rather than deleting the record and paying twice.
- If the process crashed, a `run.lock` may remain. Check no runner is active before deleting only that queue's lock file. Do not delete state.json to retry a generation.
- Download promptly: the documented query API only exposes the previous seven days of task history.

## Validation and limits

`npm run video:test` runs offline tests with mocked API calls plus real FFmpeg audio removal and poster creation. These do not verify account access or actual H3 Max output quality. That remains the purpose of the first paid pilot. No automatic clinical approval or silent import occurs.

Dependency audit found two existing moderate advisories in the Vitest development-test toolchain, unrelated to the added video dependencies. No breaking test-framework upgrade was included in this connector change.

Sources: [Create API](https://platform.minimax.io/docs/api-reference/video-generation-v2-create), [query API](https://platform.minimax.io/docs/api-reference/video-generation-v2-query), [pricing](https://platform.minimax.io/docs/guides/pricing-paygo).
