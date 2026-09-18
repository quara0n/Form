## graphify

## FormRehab: slik jobber du i dette prosjektet

Appen er en React-frontend (`src/`) og en Node-server (`server/`) som deler
samme prosess i drift. Utdypende dokumentasjon ligger i `docs/teknisk-oversikt.md`
og `deploy/README.md`.

Start og stopp på denne maskinen:

```powershell
Start-Process powershell -ArgumentList '-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File','deploy\start.ps1'
powershell -ExecutionPolicy Bypass -File deploy\stop.ps1
powershell -ExecutionPolicy Bypass -File deploy\update.ps1 -SkipPull   # backup, stopp, bygg, start
```

Innstillinger ligger i `deploy/.env.local` (ignorert av git): port, egen Node i
`NODE_EXE`, data utenfor OneDrive i `FORM_DATA_DIR`, og passord for krypterte
sikkerhetskopier. `node` finnes ikke i systemets PATH — bruk `NODE_EXE`.

Tester: `NODE_EXE node_modules\typescript\bin\tsc -b`,
`NODE_EXE --test server/app.test.mjs`, `NODE_EXE node_modules\vitest\vitest.mjs run src`,
`NODE_EXE node_modules\@playwright\test\cli.js test`.

Regler som er dyrekjøpte:

- Stopp tjenestene før `npm ci` eller andre pakkeoperasjoner. Kjører de, låses
  binærfiler i `node_modules` og installasjonen blir ødelagt.
- `prettier --write` skal bare kjøres på filer du faktisk har endret; prosjektet
  ligger i OneDrive og store omskrivinger gir støy.
- Roter ikke delingsnøkkelen for et program som allerede er skrevet ut, og
  slett ikke videofiler som lagrede programmer peker på.
- Legg aldri pasientdata i `src/` eller andre mapper som synkes av OneDrive.

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
