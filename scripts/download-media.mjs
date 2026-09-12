import { mkdir, writeFile, readFile } from "node:fs/promises";

// Editorial metadata lives only in the catalogue. These paths locate the originals.
const mediaPaths = {
  squat: "5/5c/Squat_-_exercise_demonstration_video.webm",
  row: "b/b2/Bent-over_row_-_exercise_demonstration_video.webm",
  "bench-press": "d/df/Bench_press_-_exercise_demonstration_video.webm",
  deadlift: "6/62/Deadlift_-_exercise_demonstration_video.webm",
  "hanging-crunch": "5/5e/Hanging_crunches_-_exercise_demonstration_video.webm",
  "incline-press": "8/80/Incline_press_-_exercise_demonstration_video.webm",
  "leg-raise": "b/bf/Leg_raises_-_exercise_demonstration_video.webm",
  "pull-up": "1/15/Pull-ups_-_exercise_demonstration_video.webm",
  "shoulder-press": "6/69/Shoulder_press_-_exercise_demonstration_video.webm",
  "half-squat": "a/ae/Muscle_Strengthening_at_Home_-_Half_squat.webm",
  "toe-lift": "9/91/Muscle_Strengthening_at_Home_-_Toe_Lift.webm",
  "bicep-curl": "4/44/Muscle_Strengthening_at_Home_-_Bicep_Curls.webm",
};
const entries = JSON.parse(await readFile("src/data/exercises.json", "utf8"));
await mkdir("public/exercises", { recursive: true });
for (const { id } of entries) {
  const path = mediaPaths[id];
  if (!path) throw new Error(`No download source mapped for ${id}`);
  const url = "https://upload.wikimedia.org/wikipedia/commons/" + path;
  const destination = `public/exercises/${id}.webm`;
  let data;
  try {
    data = await readFile(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((resolve) =>
        setTimeout(resolve, attempt ? 15000 : 4000),
      );
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
        headers: {
          "User-Agent":
            "FormRehabMVP/0.1 (local evaluation; openly licensed media)",
        },
      });
      if (response.status === 429 && attempt < 3) {
        await response.body?.cancel();
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      data = Buffer.from(await response.arrayBuffer());
      break;
    }
    await writeFile(destination, data);
  }
  process.stdout.write(`${id}: ${(data.length / 1048576).toFixed(1)} MB\n`);
}
