# Proposed exercise video production workflow

Prepared 2026-09-13. Research and discussion only: no paid jobs, images or credentials created.

## Verified provider facts

Use MiniMax's pay-as-you-go V2 API, model `MiniMax-H3-Max`. It supports 5–15 seconds, 480P/768P and first/last-frame image inputs, but not the generic reference-media mode. No audio-disable field was found in the documented request schema. [Create API](https://platform.minimax.io/docs/api-reference/video-generation-v2-create)

Published output pricing: $0.05/second at 480P, $0.08/second at 768P; input images currently unbilled. [Pricing](https://platform.minimax.io/docs/guides/pricing-paygo)

Create returns a task ID; poll `GET /v2/query/video_generation/{task_id}` for completion and output URL. Query history covers seven days, so save jobs and results locally. [Query API](https://platform.minimax.io/docs/api-reference/video-generation-v2-query)

## Recommended initial configuration

Five seconds, 768P, landscape first-frame images, fixed camera, one complete controlled repetition where feasible. For movements that cannot be shown clearly in five seconds, choose a clearly identified phase instead of accelerating or truncating a repetition. Use a common appearance/style reference when creating the separate exercise-specific start images later. No images should be generated now.

Start with five distinct movements. Measure wall-clock turnaround, attempts per accepted clip, visual movement fidelity and cost per accepted clip. Do not promise generation latency until this pilot runs on the actual account.

## Proposed local production tool

1. Maintain an exercise manifest: stable ID, Norwegian name, short clinical description, starting position, movement, equipment placement, camera view, image path and prompt version.
2. Codex drafts English video prompts in batches from the manifest. Save them once; ordinary queue execution uses these saved prompts and does not need repeated LLM calls.
3. Validate image availability, settings, output paths and estimated cost in a dry run. Keep the API key in a local environment variable, outside the browser app and version control.
4. Submit a small number of asynchronous jobs, initially two in flight subject to account limits. Persist each task ID immediately. Back off polling and rate-limit errors. Resume known jobs after interruption; never blindly resubmit a create request whose acceptance is uncertain.
5. Download successful outputs, retain originals, remove any audio tracks, validate playable video/duration, and extract matching posters.
6. Present a review gallery with approve/reject and a short reason. Technical checks do not establish correct exercise technique; the clinician reviews the actual movement.
7. Import only approved clips and matching descriptions into the exercise library. Keep rejected attempts and their prompt versions separate. Existing programmes retain their snapshots.

Track stages: draft, ready, submitting, queued, running, downloaded, needs-review, approved, rejected, imported, failed, submission-uncertain. Record provider/model, local job ID, prompt/image hashes, timestamps, estimated and reported usage, and output filenames.

Set a run-level spending ceiling including in-flight jobs. Suggested pilot ceiling: $10, to be agreed before any paid execution. Do not automatically regenerate rejected clips indefinitely. Fix one observed issue and explicitly queue the next version.

## Budget arithmetic, not a quote

At 768P, five seconds costs $0.40 per generated clip: 50 first attempts $20; 100 first attempts $40; two attempts per accepted clip $40/$80 respectively. Excludes image creation, taxes, currency conversion and other service fees. Verify rates before submission.

## Decisions before implementation / paid pilot

- Direct MiniMax API versus an already chosen reseller; this note assumes direct API.
- Five pilot exercise names, exact movement variants and future start images.
- Spending ceiling and account-specific concurrency limits.

The first deliverable should be a dry-run-capable local batch tool with a review gallery. A video-generation button inside the clinical builder is unnecessary for the first 50–100 assets. Kling can later use the same manifest through a separate provider adapter if needed.
