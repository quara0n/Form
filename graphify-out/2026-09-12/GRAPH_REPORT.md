# Graph Report - Rehab  (2026-09-12)

## Corpus Check
- 28 files · ~29,181 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 161 nodes · 267 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc25232`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- programmeRepository.test.ts
- programme.ts
- package.json
- MSK Rehab Builder MVP - Plan
- App.tsx
- compilerOptions
- devDependencies
- Product Contract
- Form / rehab
- @playwright/test
- scripts
- download-media.mjs
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `useProgramme()` - 10 edges
3. `Product Contract` - 10 edges
4. `@playwright/test` - 8 edges
5. `uid()` - 8 edges
6. `saveProgramme()` - 8 edges
7. `deleteProgramme()` - 8 edges
8. `scripts` - 7 edges
9. `react` - 7 edges
10. `App()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `add()` --calls--> `addExercise()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `App()` --calls--> `useProgramme()`  [EXTRACTED]
  src/App.tsx → src/features/programmes/useProgramme.ts
- `previewPrint()` --calls--> `validateProgramme()`  [EXTRACTED]
  src/App.tsx → src/domain/programme.ts
- `useProgramme()` --indirect_call--> `newProgramme()`  [INFERRED]
  src/features/programmes/useProgramme.ts → src/domain/programme.ts
- `inject()` --calls--> `listProgrammes()`  [EXTRACTED]
  src/storage/programmeRepository.test.ts → src/storage/programmeRepository.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "programmeRepository.test.ts"
Cohesion: 0.21
Nodes (20): newProgramme(), uid(), copyProgramme(), message(), SaveStatus, useProgramme(), CorruptProgrammeError, DATABASE_NAME (+12 more)

### Community 1 - "programme.ts"
Cohesion: 0.23
Nodes (14): addExercise(), duplicateItem(), formatParameter(), moveItem(), newParameter(), Parameter, ParameterKey, parameterLabels (+6 more)

### Community 2 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, lucide-react, react, react-dom, name, private, type, version (+10 more)

### Community 3 - "MSK Rehab Builder MVP - Plan"
Cohesion: 0.12
Nodes (15): Assumptions, Definition of Done, Goal Capsule, High-Level Technical Design, Implementation Units, Key Technical Decisions, MSK Rehab Builder MVP - Plan, Planning Contract (+7 more)

### Community 4 - "App.tsx"
Cohesion: 0.24
Nodes (10): lucide-react, react, App(), add(), previewPrint(), Modal(), Exercise, searchExercises() (+2 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 6 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, fake-indexeddb, @playwright/test, prettier, @types/node, @types/react, @types/react-dom, typescript (+3 more)

### Community 7 - "Product Contract"
Cohesion: 0.20
Nodes (10): Acceptance Examples, Key Decisions, Key Flow, Problem Frame, Product Contract, Reference Findings, Requirements, Scope Boundaries (+2 more)

### Community 8 - "Form / rehab"
Cohesion: 0.25
Nodes (6): Exercise media credits, Exercise content, Form / rehab, Run locally, Storage and scope, Validate

### Community 9 - "@playwright/test"
Cohesion: 0.20
Nodes (3): @playwright/test, entries, catalogue

### Community 10 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, format:check, test, test:e2e, typecheck

## Knowledge Gaps
- **76 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 87 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `programmeRepository.test.ts`, `programme.ts`, `package.json`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `@playwright/test` connect `@playwright/test` to `package.json`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `MSK Rehab Builder MVP - Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._