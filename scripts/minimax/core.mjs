import { readFile, writeFile, rename, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";

const exec = promisify(execFile);
export const API = "https://api.minimax.io";
export const MODEL = "MiniMax-H3-Max";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function saveJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + ".tmp", JSON.stringify(value, null, 2) + "\n");
  await rename(file + ".tmp", file);
}
export async function probe(file) {
  const result = await exec(
    ffprobe.path,
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    { timeout: 30000 },
  );
  return JSON.parse(result.stdout);
}
export async function compile(manifestFile) {
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (
    manifest.duration !== 5 ||
    !["480P", "768P"].includes(manifest.resolution)
  )
    throw new Error("Use duration 5 and resolution 480P or 768P.");
  if (!Array.isArray(manifest.exercises) || !manifest.exercises.length)
    throw new Error("Add at least one exercise.");
  const ids = new Set();
  const jobs = [];
  for (const exercise of manifest.exercises) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(exercise.id) || ids.has(exercise.id))
      throw new Error(
        "Exercise IDs must be unique lowercase letters, numbers and hyphens.",
      );
    ids.add(exercise.id);
    if (
      !exercise.name?.trim() ||
      !exercise.description?.trim() ||
      typeof exercise.prompt !== "string" ||
      !exercise.prompt.trim() ||
      exercise.prompt.length > 7000
    )
      throw new Error(`Invalid name, description or prompt: ${exercise.id}`);
    const content = [{ type: "text", text: exercise.prompt }];
    const imageHashes = {};
    for (const [field, role, label] of [
      ["firstFrame", "first_frame", "First frame"],
      ["lastFrame", "last_frame", "Last frame"],
    ]) {
      if (!exercise[field]) continue;
      const file = path.resolve(path.dirname(manifestFile), exercise[field]);
      const extension = path.extname(file).toLowerCase();
      const mime = {
        ".png": "png",
        ".jpg": "jpeg",
        ".jpeg": "jpeg",
        ".webp": "webp",
      }[extension];
      if (!mime)
        throw new Error(`${label} must be a local PNG, JPEG or WebP image.`);
      const bytes = await readFile(file);
      if (bytes.length > 30 * 1024 * 1024)
        throw new Error(`${label} exceeds 30 MB.`);
      const info = await probe(file);
      const stream = info.streams.find((s) => s.codec_type === "video");
      if (
        !stream ||
        Math.min(stream.width, stream.height) < 256 ||
        Math.max(stream.width, stream.height) > 5760 ||
        stream.width / stream.height < 0.4 ||
        stream.width / stream.height > 2.5
      )
        throw new Error(`${label} dimensions are outside MiniMax limits.`);
      imageHashes[role] = hash(bytes);
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/${mime};base64,${bytes.toString("base64")}`,
        },
        role,
      });
    }
    const payload = {
      model: MODEL,
      content,
      duration: 5,
      resolution: manifest.resolution,
      ratio: exercise.firstFrame || exercise.lastFrame ? "adaptive" : "16:9",
    };
    jobs.push({
      id: exercise.id,
      exercise,
      payload,
      fingerprint: hash(
        JSON.stringify({
          exercise,
          imageHashes,
          resolution: manifest.resolution,
          model: MODEL,
        }),
      ),
      estimatedUsd: manifest.resolution === "768P" ? 0.4 : 0.25,
    });
  }
  return jobs;
}
export function budgetCheck(state, amount, ceiling) {
  const reserved = Object.values(state.jobs).reduce(
    (sum, job) => sum + job.estimatedUsd,
    0,
  );
  if (
    !Number.isFinite(ceiling) ||
    ceiling <= 0 ||
    reserved + amount > ceiling + 0.000001
  )
    throw new Error(
      `Budget ceiling reached: $${reserved.toFixed(2)} already reserved. Raise --budget explicitly to continue.`,
    );
}
export async function request(method, endpoint, key, body, fetcher = fetch) {
  const response = await fetcher(API + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
    redirect: "error",
  });
  if (!response.ok) {
    const error = new Error(
      `MiniMax HTTP ${response.status}. Check balance, API access and request settings. No automatic create retry.`,
    );
    error.httpStatus = response.status;
    throw error;
  }
  return response.json();
}
export async function submit(
  job,
  state,
  persist,
  key,
  ceiling,
  fetcher = fetch,
) {
  if (state.jobs[job.id])
    throw new Error(
      "This job already has a reservation; sync or reconcile it instead of resubmitting.",
    );
  budgetCheck(state, job.estimatedUsd, ceiling);
  const record = {
    id: job.id,
    exercise: job.exercise,
    fingerprint: job.fingerprint,
    estimatedUsd: job.estimatedUsd,
    status: "submitting",
    createdAt: new Date().toISOString(),
  };
  state.jobs[job.id] = record;
  await persist(); // Durable intent precedes the potentially billable request.
  try {
    const result = await request(
      "POST",
      "/v2/video_generation",
      key,
      job.payload,
      fetcher,
    );
    if (!result.task_id) throw new Error("MiniMax did not return a task ID.");
    record.taskId = String(result.task_id);
    record.status = "queued";
    await persist();
  } catch (error) {
    record.status =
      error.httpStatus >= 400 &&
      error.httpStatus < 500 &&
      error.httpStatus !== 408
        ? "failed"
        : "submission-uncertain";
    await persist();
    throw error;
  }
  return record;
}
export async function syncRecord(record, key, fetcher = fetch) {
  const result = await request(
    "GET",
    `/v2/query/video_generation/${encodeURIComponent(record.taskId)}`,
    key,
    undefined,
    fetcher,
  );
  const task = result.task;
  if (
    !task ||
    String(task.id) !== record.taskId ||
    !["queued", "running", "succeeded", "failed", "cancelled"].includes(
      task.status,
    )
  )
    throw new Error("Unexpected MiniMax status response; local job retained.");
  record.status = task.status;
  record.usage = task.usage;
  if (task.status === "succeeded") {
    const url = new URL(task.content?.url);
    if (url.protocol !== "https:") throw new Error("Expected HTTPS video URL.");
    record.outputUrl = url.href;
  }
}
export async function prepareVideo(input, directory) {
  await mkdir(directory, { recursive: true });
  const video = path.join(directory, "video.mp4");
  await exec(
    ffmpeg,
    [
      "-y",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      video,
    ],
    { timeout: 120000 },
  );
  const info = await probe(video);
  const duration = Number(info.format.duration);
  if (
    info.streams.some((s) => s.codec_type === "audio") ||
    !info.streams.some((s) => s.codec_type === "video") ||
    !Number.isFinite(duration) ||
    Math.abs(duration - 5) > 0.25
  )
    throw new Error(
      "Output must be a playable five-second video with no audio. Original retained for inspection.",
    );
  await exec(
    ffmpeg,
    [
      "-y",
      "-ss",
      "0.2",
      "-i",
      video,
      "-frames:v",
      "1",
      "-vf",
      "scale=640:-2",
      path.join(directory, "poster.jpg"),
    ],
    { timeout: 30000 },
  );
  return { duration, video };
}
export async function download(record, runDir, fetcher = fetch) {
  const directory = path.join(runDir, record.id);
  await mkdir(directory, { recursive: true });
  const original = path.join(directory, "original.mp4");
  try {
    await access(original);
  } catch {
    const response = await fetcher(record.outputUrl, {
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok)
      throw new Error(
        `Download HTTP ${response.status}; rerun sync to retry without generating again.`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(original + ".part", bytes);
    await rename(original + ".part", original);
  }
  await prepareVideo(original, directory);
  record.status = "needs-review";
}
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function gallery(state, runDir) {
  const cards = Object.values(state.jobs)
    .map(
      (job) =>
        `<article><h2>${escape(job.exercise.name)}</h2><p>${escape(job.id)} · ${escape(job.status)}</p>${["needs-review", "approved"].includes(job.status) ? `<video src="${job.id}/video.mp4" poster="${job.id}/poster.jpg" controls loop muted></video>` : ""}<p>${escape(job.exercise.description)}</p><details><summary>Prompt</summary><p>${escape(job.exercise.prompt)}</p></details><p>After reviewing the movement, use the approve command with ID ${escape(job.id)}.</p></article>`,
    )
    .join("");
  await writeFile(
    path.join(runDir, "review.html"),
    `<!doctype html><meta charset="utf-8"><title>Form video review</title><style>body{font:16px system-ui;background:#f5f7f2;color:#25463a;max-width:1100px;margin:30px auto;padding:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}article{background:white;padding:20px;border-radius:12px}video{width:100%}</style><h1>Exercise video review</h1><p>Only approved clips are ready for your library. Check the full movement, equipment and body position.</p><main>${cards}</main>`,
  );
}
