import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(await readFile(path.join(root, 'apparater-prompter-v3.json'), 'utf8'));
const approved = path.join(root, 'approved');
const wan = new Set([7, 8, 9, 10, 14, 15, 17, 20, 21, 22, 24, 26, 30, 31, 34, 39, 41, 42, 45, 46, 48]);
const wanCycles = new Set([14, 24, 26, 39]);
const h3 = new Map([
  [18, 'kort-18-h3-retry-v1.mp4'],
  [19, 'kort-19-h3-retry-v1.mp4'],
  [23, 'kort-23-h3-retry-v1.mp4'],
  [25, 'kort-25-h3-peak-v1-final-5s.mp4'],
  [27, 'kort-27-h3-retry-v3-cycle.mp4'],
  [28, 'kort-28-h3-peak-v1-cycle.mp4'],
  [29, 'kort-29-h3-reverse-v1-cycle.mp4'],
  [32, 'kort-32-h3-peak-v1-final-5s.mp4'],
  [33, 'kort-33-h3-peak-v1-cycle.mp4'],
  [35, 'kort-35-h3-peak-v1-cycle.mp4'],
  [37, 'kort-37-h3-retry-v1.mp4'],
  [40, 'kort-40-h3-peak-v1-cycle.mp4'],
]);
const notes = new Map([
  [7, 'Ny kontroll 25.09: startbildet viser bare halvveis senking; dyp bunnstilling mangler. Må produseres på nytt.'],
  [14, 'Returfasen er laget ved å reversere en godkjent pressfase.'],
  [23, 'Kontrollert, moderat krumming av overkroppen; håndtak og vektstabel følger bevegelsen.'],
  [24, 'Returfasen er laget ved å reversere en godkjent rofase.'],
  [25, 'Ny kontroll 25.09: hælen senkes ikke tydelig under tåplatens overflate. Må produseres på nytt.'],
  [26, 'Returfasen er laget ved å reversere en godkjent pressfase.'],
  [27, 'Ny kontroll 25.09: hælen er under tåplaten i start, men samlet ankelutslag er lite. Krever ny faglig vurdering.'],
  [28, 'Overkroppen krummes fremover; returfasen er reversert.'],
  [29, 'Ny kontroll 25.09: liten synlig bevegelse; vurder ankelutslag og stabil knestilling på nytt.'],
  [32, 'Ny kontroll 25.09: for liten synlig senkning og heving av hælen. Må produseres på nytt.'],
  [33, 'Press over hodet; returfasen er reversert.'],
  [35, 'Ettbens knebøy med fribeinet foran; returfasen er reversert.'],
  [39, 'Returfasen er laget ved å reversere en godkjent pressfase.'],
  [40, 'Overkroppen krummes fremover; returfasen er reversert.'],
]);
const redoRequired = new Set([7, 25, 32]);
const reviewRequired = new Set([27, 29]);

const rows = source.rows.filter((row) => row.state === 'frame_pass').sort((a, b) => a.card - b.card);
if (rows.length !== 33 || wan.size !== 21 || h3.size !== 12) throw new Error('Unexpected production selection.');
const expected = new Set([...wan, ...h3.keys()]);
if (rows.some((row) => !expected.has(row.card)) || expected.size !== rows.length) throw new Error('Source and approved card IDs differ.');
await mkdir(approved, { recursive: true });
const results = [];
for (const row of rows) {
  const card = String(row.card).padStart(2, '0');
  const videoSource = wan.has(row.card)
    ? path.join(root, 'runs', 'fal-wan-turbo-v1', `kort-${card}-v3${wanCycles.has(row.card) ? '-cycle' : ''}.mp4`)
    : path.join(root, 'runs', 'fal-h3-max-v1', h3.get(row.card));
  const frameSource = path.join(root, row.candidateFirstFrame);
  const video = `approved/kort-${card}.mp4`;
  const frame = `approved/kort-${card}-start.png`;
  const videoBytes = await readFile(videoSource);
  const frameBytes = await readFile(frameSource);
  if (videoBytes.length < 100_000 || frameBytes.length < 100_000) throw new Error(`Suspiciously small media: card ${card}`);
  await copyFile(videoSource, path.join(root, video));
  await copyFile(frameSource, path.join(root, frame));
  results.push({
    card: row.card,
    exercise: row.exercise,
    frame,
    video,
    model: wan.has(row.card) ? 'Wan 2.2 Turbo' : 'MiniMax H3 Max',
    qa: redoRequired.has(row.card) ? 'redo_required' : reviewRequired.has(row.card) ? 'review_required' : 'approved',
    note: notes.get(row.card) || 'Startstilling, apparat og bevegelsesbane visuelt kontrollert.',
    sha256: createHash('sha256').update(videoBytes).digest('hex'),
  });
}
if (new Set(results.map((row) => row.sha256)).size !== 33) throw new Error('Duplicate video bytes.');
const output = {
  name: 'apparater-leveranse-v1',
  date: '2026-09-24',
  durationSeconds: 5,
  existingAppVideos: [1, 2, 3, 4, 5, 6, 11],
  existingLibraryMatches: [13, 16, 38],
  removedCards: [12, 36, 43, 44, 47],
  exercises: results,
};
await writeFile(path.join(root, 'apparater-leveranse-v1.json'), `${JSON.stringify(output, null, 2)}\n`);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cards = results.map((row) => `<article data-qa="${esc(row.qa)}"><div class="head"><strong>#${row.card} · ${esc(row.exercise)}</strong><span>${row.qa === 'redo_required' ? 'Må lages på nytt' : row.qa === 'review_required' ? 'Ny vurdering' : 'Tidligere godkjent'}</span></div><p>${esc(row.note)}</p><img loading="lazy" src="${esc(row.frame)}" alt="Startbilde: ${esc(row.exercise)}"><video controls preload="metadata" poster="${esc(row.frame)}" src="${esc(row.video)}"></video></article>`).join('\n');
const html = `<!doctype html><html lang="no"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>33 apparatvideoer – kvalitetsrevisjon</title><style>body{font:16px system-ui;margin:0;background:#f1f4f1;color:#24352e}header{padding:24px 4vw;background:#183c30;color:#fff}h1{font-size:1.65rem;margin:0 0 8px}header p{margin:0;max-width:78ch}main{max-width:1450px;margin:22px auto;padding:0 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}article{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px #0002;border-top:7px solid #27a065}article[data-qa=redo_required]{border-top-color:#ba432e}article[data-qa=review_required]{border-top-color:#d28a18}.head{padding:14px 16px 0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.head span{font-size:.78rem;white-space:nowrap;color:#496959}article p{padding:0 16px;min-height:2.8em}img,video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#f9faf9}video{background:#161a19}</style><header><h1>33 apparatvideoer – kvalitetsrevisjon</h1><p>Tidligere godkjenning er under ny vurdering. Tre klipp må lages på nytt og to trenger ny faglig kontroll. <a href="research-2026-09-25/bevegelsesutslag-og-modellvalg.md" style="color:#fff">Se funn og prøveplan</a>. Ett eget femsekundersklipp per kort.</p></header><main>${cards}</main></html>`;
await writeFile(path.join(root, 'apparater-leveranse.html'), html);
const report = `# Apparatvideoer – leveranse 24.09.2026\n\n` +
  `33 videoer ble tidligere merket godkjent. Ny kvalitetskontroll 25.09 fant at tre må lages på nytt og to må vurderes på nytt. Øvrige klipp har ikke fått en ny samlet kontroll. Se [funn og prøveplan](research-2026-09-25/bevegelsesutslag-og-modellvalg.md), [galleriet](apparater-leveranse.html) og [maskinlesbar oversikt](apparater-leveranse-v1.json).\n\n` +
  `| Kort | Øvelse | Modell | Kontrollmerknad |\n| ---: | --- | --- | --- |\n` +
  results.map((row) => `| ${row.card} | ${row.exercise} | ${row.model} | ${row.note} |`).join('\n') +
  `\n\nKort 1–6 og 11 hadde video fra før. Kort 13, 16 og 38 svarer til eksisterende bibliotekøvelser. Kort 12, 36, 43, 44 og 47 er tatt ut. Disse kortene er ikke produsert på nytt.\n\n` +
  `Anslått genereringskostnad: $3.30 for 33 Wan-klipp, $3.80 for 19 H3-klipp og $0.20 for to Wan-prøver som fortsatt står som IN_PROGRESS hos fal: omtrent **$7.30** før eventuelle avgifter. Det er et anslag, ikke avlest faktura. Avviste prøveklipp er ikke med i leveransen.\n\n` +
  `Videoene er generert fra tidligere valgte startbilder. Tidligere godkjenning var for svak når det gjelder ytterstillinger og bevegelsesutslag; se ny revisjon før bruk som instruksjon.\n`;
await writeFile(path.join(root, 'apparater-leveranse.md'), report);
const videoSize = (await Promise.all(results.map((row) => stat(path.join(root, row.video))))).reduce((sum, item) => sum + item.size, 0);
console.log(`Packaged ${results.length} unique videos and start frames; videos ${(videoSize / 1024 / 1024).toFixed(1)} MiB.`);
