# Graph Report - Rehab  (2026-09-17)

## Corpus Check
- 64 files · ~115,260 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 281 nodes · 454 edges · 22 communities (15 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `15b9fa20`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- programmeRepository.test.ts
- programme.ts
- package.json
- Product Contract
- core.mjs
- compilerOptions
- devDependencies
- MVP validation
- MiniMax: first video batch
- @playwright/test
- scripts
- download-media.mjs
- AGENTS.md
- Proposed exercise video production workflow
- gluteal-five-notes.md
- lumbago-five-notes.md
- production-preferences.md
- bird-dog-front-v5-review.md
- bird-dog-textbook-v4-review.md
- parseSpokenCommand.ts
- useVoiceCapture.ts
- import-approved.mjs

## God Nodes (most connected - your core abstractions)
1. `scripts` - 13 edges
2. `compilerOptions` - 12 edges
3. `@playwright/test` - 10 edges
4. `useProgramme()` - 10 edges
5. `Product Contract` - 10 edges
6. `react` - 9 edges
7. `main()` - 9 edges
8. `App()` - 9 edges
9. `uid()` - 8 edges
10. `parseSpokenCommand()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `compile()`  [EXTRACTED]
  scripts/minimax/core.test.mjs → scripts/minimax/core.mjs
- `App()` --calls--> `useProgramme()`  [EXTRACTED]
  src/App.tsx → src/features/programmes/useProgramme.ts
- `add()` --calls--> `addExercise()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `previewPrint()` --calls--> `validateProgramme()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `handleVoiceCommand()` --calls--> `parseSpokenCommand()`  [EXTRACTED]
  src/App.tsx → src/features/voice/parseSpokenCommand.ts

## Import Cycles
- None detected.

## Communities (22 total, 7 thin omitted)

### Community 0 - "programmeRepository.test.ts"
Cohesion: 0.21
Nodes (19): newProgramme(), copyProgramme(), message(), SaveStatus, useProgramme(), CorruptProgrammeError, DATABASE_NAME, deleteProgramme() (+11 more)

### Community 1 - "programme.ts"
Cohesion: 0.10
Nodes (33): lucide-react, react, App(), add(), handleVoiceCommand(), previewPrint(), describePrescription(), Modal() (+25 more)

### Community 2 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, lucide-react, react, react-dom, name, private, type, version (+10 more)

### Community 3 - "Product Contract"
Cohesion: 0.08
Nodes (25): Acceptance Examples, Assumptions, Definition of Done, Goal Capsule, High-Level Technical Design, Implementation Units, Key Decisions, Key Flow (+17 more)

### Community 4 - "core.mjs"
Cohesion: 0.15
Nodes (23): ffmpeg-static, ffprobe-static, [command = "plan", ...args], API, budgetCheck(), compile(), download(), escape() (+15 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 6 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, fake-indexeddb, ffmpeg-static, ffprobe-static, @playwright/test, prettier, @types/node, @types/react (+5 more)

### Community 7 - "MVP validation"
Cohesion: 0.50
Nodes (3): Evidence, Findings resolved, MVP validation

### Community 8 - "MiniMax: first video batch"
Cohesion: 0.12
Nodes (13): Exercise media credits, Batches, recovery and spending, MiniMax: first video batch, Optional starting image, Start paid generation only when ready, Validation and limits, What you need to do, Exercise content (+5 more)

### Community 9 - "@playwright/test"
Cohesion: 0.15
Nodes (4): @playwright/test, entries, generated, catalogue

### Community 10 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, format:check, test, test:e2e, typecheck, video:doctor (+5 more)

### Community 13 - "Proposed exercise video production workflow"
Cohesion: 0.29
Nodes (6): Budget arithmetic, not a quote, Decisions before implementation / paid pilot, Proposed exercise video production workflow, Proposed local production tool, Recommended initial configuration, Verified provider facts

### Community 19 - "parseSpokenCommand.ts"
Cohesion: 0.22
Nodes (16): candidates(), levenshtein(), matchExercise(), normalize(), numberWords, parseDosage(), parseSpokenCommand(), replaceNumberWords() (+8 more)

### Community 20 - "useVoiceCapture.ts"
Cohesion: 0.18
Nodes (10): SpeechAlternative, SpeechErrorEvent, SpeechEvent, SpeechRecognitionConstructor, SpeechRecognitionLike, SpeechResult, SpeechResultList, useVoiceCapture() (+2 more)

### Community 21 - "import-approved.mjs"
Cohesion: 0.25
Nodes (3): imported, options, skipped

## Knowledge Gaps
- **125 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 153 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `programme.ts` to `programmeRepository.test.ts`, `package.json`, `useVoiceCapture.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `programme.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10083256244218317 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Product Contract` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._