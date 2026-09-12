# MVP validation

Validated locally on 2026-09-12.

The Compound Engineering review completed as run `rehab-20260911`. It reviewed the original staged snapshot and returned five findings. Correctness, testing, security, reliability and adversarial reviewers ran independently. Maintainability and frontend race checks used local review after interrupted agents; no independent cross-model CLI was available.

## Findings resolved

1. Replaced generic catalogue text with 12 movement-specific descriptions. Corrected the unsupported half squat and standing calf raise names/equipment against decoded video frames. Downloading media now preserves the editorial catalogue.
2. Gated the printable subtree itself on current draft validity and loading state. Native browser printing produces a correction message for invalid/empty drafts, rather than silently omitting invalid dosage.
3. Added accessible names to custom parameter value inputs and verified entry through the accessible textbox name.
4. Corrected conflict guidance to the implemented recovery: save edits as a copy, then reopen the original. A separate destructive discard action is unnecessary for the planned save-copy-or-reload requirement.
5. Added a deterministic test that holds a real repository save promise unresolved while further edits occur, then releases it and checks the latest fields after reload.

The media download timeout concern was also fixed with a 60-second fetch/body timeout. Library additions during initial loading no longer claim success.

## Evidence

- Production build and TypeScript checks pass.
- Ten unit tests cover prescription semantics, duplication and IndexedDB failures/integrity/conflicts.
- Ten Chrome scenarios cover library search and filters, decoding/seeking all 12 videos, pending saves, native print validation, accessible custom fields, independent prescriptions, save/reopen, failure/focus behavior, mobile layout, cross-tab recovery, confirmed deletion and long handouts.
- Desktop/mobile screenshots and generated A4 PDFs were visually inspected. A five-exercise handout with long notes paginated over two pages without clipping.
- Prettier checks pass. No separate lint configuration exists.
- Graphify AST graph refreshed locally.

Clinical content suitability and the proposed under-three-minute clinician usability target remain unvalidated. This is a local evaluation MVP with a small strength-focused catalogue, not a patient record system or a comprehensive MSK library. No production deployment or runtime monitoring is involved.
