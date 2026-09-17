import { readFile, mkdir, open, unlink, access } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import {
  compile,
  hash,
  saveJson,
  submit,
  syncRecord,
  download,
  gallery,
} from "./minimax/core.mjs";

try {
  process.loadEnvFile(".env.minimax");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const [command = "plan", ...args] = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (flag === "--submit") options.submit = true;
  else if (
    ["--manifest", "--budget", "--id", "--task"].includes(flag) &&
    args[index + 1] &&
    !args[index + 1].startsWith("--")
  )
    options[flag.slice(2)] = args[++index];
  else throw new Error(`Unknown or incomplete option: ${flag}`);
}
async function main() {
  if (
    !["plan", "doctor", "run", "sync", "review", "approve", "attach"].includes(
      command,
    )
  )
    throw new Error(
      "Commands: plan, doctor, run --submit --budget USD, sync, review, approve --id ID, attach --id ID --task TASK_ID. Optional: --manifest PATH.",
    );
  const key = process.env.MINIMAX_API_KEY;
  if (command === "doctor") {
    await access(ffmpeg);
    await access(ffprobe.path);
    console.log(
      `API key: ${key?.trim() ? "configured (not authenticated yet)" : "MISSING — copy .env.minimax.example to .env.minimax and add your pay-as-you-go key"}\nVideo tools: installed\nNo API request made.`,
    );
    return;
  }
  const manifest = path.resolve(
    options.manifest || "video-production/pilot.json",
  );
  const runDir = path.resolve(
    "video-production/runs",
    hash(manifest).slice(0, 12),
  );
  const stateFile = path.join(runDir, "state.json");
  await mkdir(runDir, { recursive: true });
  let lock;
  try {
    lock = await open(path.join(runDir, "run.lock"), "wx");
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `This queue is locked. If an earlier process crashed, verify it has stopped, then remove only ${path.join(runDir, "run.lock")}.`,
      );
    throw error;
  }
  await lock.writeFile(String(process.pid));
  try {
    let state = { version: 1, manifest, jobs: {} };
    try {
      state = JSON.parse(await readFile(stateFile, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (state.version !== 1 || !state.jobs || state.manifest !== manifest)
      throw new Error("Unsupported queue state; retained without changes.");
    const persist = () => saveJson(stateFile, state);
    if (command === "review") {
      await gallery(state, runDir);
      console.log(path.join(runDir, "review.html"));
      return;
    }
    if (command === "approve") {
      const record = state.jobs[options.id];
      if (record?.status !== "needs-review")
        throw new Error(
          "Only a downloaded clip awaiting review can be approved.",
        );
      record.status = "approved";
      record.approvedAt = new Date().toISOString();
      await persist();
      await gallery(state, runDir);
      console.log(
        `Approved ${record.id}. Silent video and poster: ${path.join(runDir, record.id)}\nReady for a separate reviewed catalogue import.`,
      );
      return;
    }
    const jobs = await compile(manifest);
    for (const job of jobs)
      if (
        state.jobs[job.id] &&
        state.jobs[job.id].fingerprint !== job.fingerprint
      )
        throw new Error(
          `${job.id} changed after submission. Restore its original settings or use a new version ID; old jobs are retained.`,
        );
    const pending = jobs.filter((job) => !state.jobs[job.id]);
    const reserved = Object.values(state.jobs).reduce(
      (sum, record) => sum + record.estimatedUsd,
      0,
    );
    const extra = pending.reduce((sum, job) => sum + job.estimatedUsd, 0);
    console.log(
      `${jobs.length} exercises; ${pending.length} new. Reserved estimate $${reserved.toFixed(2)}; new estimate $${extra.toFixed(2)}.\nPricing checked 2026-09-13; estimates exclude taxes and image creation.\nState: ${stateFile}`,
    );
    for (const job of jobs)
      console.log(
        `${job.id}: ${state.jobs[job.id]?.status || "draft"} | ${job.payload.resolution}, 5s | ${[job.exercise.firstFrame && "first-frame", job.exercise.lastFrame && "last-frame"].filter(Boolean).join(" + ") || "TEXT ONLY — no frame images set"}`,
      );
    if (command === "plan" || (command === "run" && !options.submit)) {
      console.log(
        "Dry run only. No API request or spend. Use run --submit --budget USD to generate.",
      );
      return;
    }
    if (!key?.trim())
      throw new Error(
        "MINIMAX_API_KEY is missing. Run npm run video:doctor for setup.",
      );
    if (command === "attach") {
      const record = state.jobs[options.id];
      if (
        !record ||
        !["submitting", "submission-uncertain"].includes(record.status) ||
        !/^\d+$/.test(options.task || "")
      )
        throw new Error(
          "Attach requires an uncertain local job and a verified task ID from your MiniMax console.",
        );
      const candidate = { ...record, taskId: options.task };
      await syncRecord(candidate, key);
      Object.assign(record, candidate);
      await persist();
      console.log("Task linked; run sync to download its result.");
      return;
    }
    const active = () =>
      Object.values(state.jobs).filter((record) =>
        ["queued", "running", "succeeded"].includes(record.status),
      );
    if (command === "run") {
      const uncertain = Object.values(state.jobs).find((record) =>
        ["submitting", "submission-uncertain"].includes(record.status),
      );
      if (uncertain)
        throw new Error(
          `${uncertain.id} has an uncertain submission. Check the MiniMax console and use attach; do not blindly resubmit.`,
        );
      const budget = Number(options.budget);
      if (
        !Number.isFinite(budget) ||
        budget <= 0 ||
        reserved + extra > budget + 0.000001
      )
        throw new Error(
          `Set --budget to at least ${(reserved + extra).toFixed(2)} for this manifest. No new jobs submitted.`,
        );
      const deadline = Date.now() + 30 * 60 * 1000;
      while (pending.length || active().length) {
        while (pending.length && active().length < 2) {
          const job = pending.shift();
          await submit(job, state, persist, key, budget);
          console.log(`${job.id}: submitted`);
        }
        await syncAll();
        if (Date.now() > deadline) {
          console.log(
            "Stopped polling after 30 minutes. Resume the same command; known jobs will not be resubmitted.",
          );
          break;
        }
        if (active().length) await sleep(10000);
      }
    } else if (command === "sync") await syncAll();
    await gallery(state, runDir);
    console.log(`Review: ${path.join(runDir, "review.html")}`);
    const failures = Object.values(state.jobs).filter((record) =>
      ["failed", "cancelled"].includes(record.status),
    );
    if (failures.length) {
      console.error(
        `${failures.length} jobs did not succeed. Inspect them in the console; reruns do not regenerate failed IDs.`,
      );
      process.exitCode = 1;
    }
    async function syncAll() {
      for (const record of active()) {
        // A known task is always queried again; no new billable create call.
        await syncRecord(record, key);
        await persist();
        if (record.status === "succeeded") {
          await download(record, runDir);
          await persist();
        }
        console.log(`${record.id}: ${record.status}`);
      }
    }
  } finally {
    await lock.close();
    await unlink(path.join(runDir, "run.lock"));
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
