# Graph Report - Rehab  (2026-09-13)

## Corpus Check
- 46 files · ~48,580 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 224 nodes · 360 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6d4f0bd`
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

## God Nodes (most connected - your core abstractions)
1. `scripts` - 13 edges
2. `compilerOptions` - 12 edges
3. `useProgramme()` - 10 edges
4. `Product Contract` - 10 edges
5. `@playwright/test` - 9 edges
6. `main()` - 9 edges
7. `uid()` - 8 edges
8. `saveProgramme()` - 8 edges
9. `deleteProgramme()` - 8 edges
10. `react` - 7 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `compile()`  [EXTRACTED]
  scripts/minimax/core.test.mjs → scripts/minimax/core.mjs
- `App()` --calls--> `useProgramme()`  [EXTRACTED]
  src/App.tsx → src/features/programmes/useProgramme.ts
- `add()` --calls--> `addExercise()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `previewPrint()` --calls--> `validateProgramme()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `useProgramme()` --indirect_call--> `newProgramme()`  [INFERRED]
  src/features/programmes/useProgramme.ts → src/domain/programme.ts

## Import Cycles
- None detected.

## Communities (17 total, 5 thin omitted)

### Community 0 - "programmeRepository.test.ts"
Cohesion: 0.21
Nodes (20): newProgramme(), uid(), copyProgramme(), message(), SaveStatus, useProgramme(), CorruptProgrammeError, DATABASE_NAME (+12 more)

### Community 1 - "programme.ts"
Cohesion: 0.14
Nodes (24): lucide-react, react, App(), add(), previewPrint(), Modal(), addExercise(), duplicateItem() (+16 more)

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
Cohesion: 0.13
Nodes (12): Exercise media credits, Batches, recovery and spending, MiniMax: first video batch, Optional starting image, Start paid generation only when ready, Validation and limits, What you need to do, Exercise content (+4 more)

### Community 9 - "@playwright/test"
Cohesion: 0.17
Nodes (4): @playwright/test, entries, generated, catalogue

### Community 10 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, format:check, test, test:e2e, typecheck, video:doctor (+5 more)

### Community 13 - "Proposed exercise video production workflow"
Cohesion: 0.29
Nodes (6): Budget arithmetic, not a quote, Decisions before implementation / paid pilot, Proposed exercise video production workflow, Proposed local production tool, Recommended initial configuration, Verified provider facts

## Knowledge Gaps
- **105 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 124 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `programme.ts` to `programmeRepository.test.ts`, `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `programme.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Product Contract` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._