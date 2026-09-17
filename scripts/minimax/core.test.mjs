import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compile,
  submit,
  syncRecord,
  budgetCheck,
  prepareVideo,
  gallery,
} from "./core.mjs";

const exercise = {
  id: "test-bridge",
  name: "Bridge",
  description: "Raise and lower pelvis.",
  prompt: "One complete bridge.",
};
async function fixture(exercises = [exercise]) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "rehab-minimax-"));
  const file = path.join(dir, "batch.json");
  await writeFile(
    file,
    JSON.stringify({ duration: 5, resolution: "768P", exercises }),
  );
  return { dir, jobs: await compile(file) };
}
test("builds a five-second H3 Max request and rejects duplicate IDs", async () => {
  const { jobs } = await fixture();
  assert.equal(jobs[0].payload.model, "MiniMax-H3-Max");
  assert.equal(jobs[0].payload.duration, 5);
  assert.equal(jobs[0].estimatedUsd, 0.4);
  await assert.rejects(() => fixture([exercise, exercise]), /unique/);
});
test("reserves budget durably before POST and stores task ID", async () => {
  const { jobs } = await fixture();
  const state = { jobs: {} };
  const saves = [];
  await submit(
    jobs[0],
    state,
    async () => saves.push(structuredClone(state)),
    "test",
    1,
    async (url, options) => {
      assert.equal(saves[0].jobs[exercise.id].status, "submitting");
      assert.equal(options.method, "POST");
      assert.equal(url, "https://api.minimax.io/v2/video_generation");
      return { ok: true, json: async () => ({ task_id: "123" }) };
    },
  );
  assert.equal(state.jobs[exercise.id].taskId, "123");
  await assert.rejects(
    () => submit(jobs[0], state, async () => {}, "test", 1),
    /already/,
  );
  assert.throws(() => budgetCheck(state, 0.4, 0.5), /Budget/);
});
test("uncertain POST is retained and never automatically retried", async () => {
  const { jobs } = await fixture();
  const state = { jobs: {} };
  let requests = 0;
  const fetcher = async () => {
    requests++;
    throw new Error("timeout");
  };
  await assert.rejects(
    () => submit(jobs[0], state, async () => {}, "test", 1, fetcher),
    /timeout/,
  );
  assert.equal(state.jobs[exercise.id].status, "submission-uncertain");
  await assert.rejects(
    () => submit(jobs[0], state, async () => {}, "test", 1, fetcher),
    /already/,
  );
  assert.equal(requests, 1);
});
test("polls known task and retains provider failure status", async () => {
  const record = { taskId: "123", status: "queued" };
  await syncRecord(record, "test", async () => ({
    ok: true,
    json: async () => ({ task: { id: "123", status: "failed" } }),
  }));
  assert.equal(record.status, "failed");
});
test("definitive authentication rejection does not pretend a task was created", async () => {
  const { jobs } = await fixture();
  const state = { jobs: {} };
  await assert.rejects(
    () =>
      submit(
        jobs[0],
        state,
        async () => {},
        "test",
        1,
        async () => ({ ok: false, status: 401 }),
      ),
    /HTTP 401/,
  );
  assert.equal(state.jobs[exercise.id].status, "failed");
  assert.equal(state.jobs[exercise.id].taskId, undefined);
});
test("sends a verified local first-frame image with adaptive aspect ratio", async () => {
  const { jobs } = await fixture([
    { ...exercise, firstFrame: path.resolve("public/exercises/squat.jpg") },
  ]);
  assert.equal(jobs[0].payload.ratio, "adaptive");
  assert.equal(jobs[0].payload.content[1].role, "first_frame");
  assert.match(
    jobs[0].payload.content[1].image_url.url,
    /^data:image\/jpeg;base64,/,
  );
});
test("sends a last frame after the first frame", async () => {
  const { jobs } = await fixture([
    {
      ...exercise,
      firstFrame: path.resolve("public/exercises/squat.jpg"),
      lastFrame: path.resolve("public/exercises/squat.jpg"),
    },
  ]);
  assert.equal(jobs[0].payload.ratio, "adaptive");
  assert.deepEqual(
    jobs[0].payload.content.map((part) => part.role),
    [undefined, "first_frame", "last_frame"],
  );
});
test("accepts a last frame on its own", async () => {
  const { jobs } = await fixture([
    { ...exercise, lastFrame: path.resolve("public/exercises/squat.jpg") },
  ]);
  assert.equal(jobs[0].payload.ratio, "adaptive");
  assert.equal(jobs[0].payload.content[1].role, "last_frame");
});
test("rejects a last frame that is not an image", async () => {
  await assert.rejects(
    () => fixture([{ ...exercise, lastFrame: path.resolve("package.json") }]),
    /Last frame must be a local PNG, JPEG or WebP image/,
  );
});
test("changing only the last frame changes the fingerprint", async () => {
  const firstFrame = path.resolve("public/exercises/squat.jpg");
  const { jobs: first } = await fixture([
    {
      ...exercise,
      firstFrame,
      lastFrame: path.resolve("public/exercises/row.jpg"),
    },
  ]);
  const { jobs: second } = await fixture([
    {
      ...exercise,
      firstFrame,
      lastFrame: path.resolve("public/exercises/deadlift.jpg"),
    },
  ]);
  assert.notEqual(first[0].fingerprint, second[0].fingerprint);
});
test("escapes review content", async () => {
  const { dir } = await fixture();
  await gallery(
    {
      jobs: {
        x: {
          id: "x",
          status: "queued",
          exercise: { name: "<script>alert(1)</script>", description: "safe" },
        },
      },
    },
    dir,
  );
  const html = await readFile(path.join(dir, "review.html"), "utf8");
  assert.ok(!html.includes("<script>"));
});
test("prepares a silent five-second H264 video and matching poster", async () => {
  const { dir } = await fixture();
  const { default: ffmpeg } = await import("ffmpeg-static");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const input = path.join(dir, "source.mp4");
  await promisify(execFile)(ffmpeg, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=green:s=320x240:d=5",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=5",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-shortest",
    input,
  ]);
  const output = await prepareVideo(input, path.join(dir, "output"));
  assert.ok(Math.abs(output.duration - 5) < 0.1);
  assert.ok((await readFile(path.join(dir, "output/poster.jpg"))).length > 0);
});
