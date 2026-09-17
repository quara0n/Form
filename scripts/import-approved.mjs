#!/usr/bin/env node
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const options = parseArgs(process.argv.slice(2));
const target = options.target || "src/data/generated-exercises.json";
const mediaRoot = options.media || path.join("public", "media", "generated");
const collection = options.collection || "Apparater";
const overrides = await readJson(
  "video-production/catalogue-overrides.json",
  {},
);
const runs = options.run?.length ? options.run : await discoverRuns();
const library = await readJson(target, []);
const imported = [];
const skipped = [];

for (const runDir of runs) {
  const stateFile = path.join(runDir, "state.json");
  const state = await readJson(stateFile, null);
  if (!state?.jobs) {
    skipped.push(`${stateFile}: no queue state`);
    continue;
  }
  const manifest = await readJson(state.manifest, null);
  const byId = new Map((manifest?.exercises || []).map((e) => [e.id, e]));
  for (const record of Object.values(state.jobs)) {
    if (record.status !== "approved") {
      skipped.push(`${record.id}: ${record.status}`);
      continue;
    }
    const exercise = byId.get(record.id) || record.exercise;
    const source = path.join(runDir, record.id);
    const video = path.join(source, "video.mp4");
    const poster = path.join(source, "poster.jpg");
    if (!(await exists(video)) || !(await exists(poster))) {
      skipped.push(`${record.id}: missing video.mp4 or poster.jpg`);
      continue;
    }
    const override = overrides[record.id] || {};
    const entry = {
      id: record.id,
      name: override.name || exercise.name,
      description: override.description || exercise.description,
      region: exercise.region,
      equipment: exercise.equipment,
      tags: override.tags || [
        collection,
        "Form",
        override.name || exercise.name,
      ],
      video: `/media/generated/${record.id}/video.mp4`,
      poster: `/media/generated/${record.id}/poster.jpg`,
      source: `/media/generated/${record.id}/video.mp4`,
      credit: "Form · MiniMax",
      license: "AI-generert",
      collection: override.collection || collection,
      reviewNote: override.reviewNote || "",
    };
    if (!options.dryRun) {
      const outDir = path.join(mediaRoot, record.id);
      await mkdir(outDir, { recursive: true });
      await copyFile(video, path.join(outDir, "video.mp4"));
      await copyFile(poster, path.join(outDir, "poster.jpg"));
    }
    const index = library.findIndex((e) => e.id === entry.id);
    if (index >= 0) library[index] = entry;
    else library.push(entry);
    imported.push(entry.id);
  }
}

if (!options.dryRun && imported.length)
  await writeFile(target, JSON.stringify(library, null, 2) + "\n");

console.log(
  `${options.dryRun ? "Dry run: " : ""}imported ${imported.length} clip(s) into ${target}`,
);
for (const id of imported) console.log(`  + ${id}`);
for (const note of skipped) console.log(`  - ${note}`);

function parseArgs(argv) {
  const parsed = { run: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--run") parsed.run.push(argv[(index += 1)]);
    else if (value === "--collection") parsed.collection = argv[(index += 1)];
    else if (value === "--target") parsed.target = argv[(index += 1)];
    else if (value === "--media") parsed.media = argv[(index += 1)];
    else if (value === "--dry-run") parsed.dryRun = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}

async function discoverRuns() {
  const root = path.join("video-production", "runs");
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
