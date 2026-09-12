import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173");
const entries = JSON.parse(await readFile("src/data/exercises.json", "utf8"));
for (const e of entries) {
  const result = await page.evaluate(
    async ({ src, at }) => {
      const v = document.createElement("video");
      v.muted = true;
      v.src = src;
      document.body.append(v);
      await new Promise((resolve, reject) => {
        v.onloadeddata = resolve;
        v.onerror = () => reject(new Error("video failed"));
      });
      v.currentTime = Math.min(at, v.duration / 2);
      await new Promise((r) => (v.onseeked = r));
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = Math.round((640 * v.videoHeight) / v.videoWidth);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const image = c.toDataURL("image/jpeg", 0.9);
      const duration = v.duration;
      v.remove();
      return { image, duration };
    },
    { src: e.video, at: e.credit === "FitnessScape" ? 2 : 18 },
  );
  await writeFile(
    "public" + e.poster,
    Buffer.from(result.image.split(",")[1], "base64"),
  );
  console.log(e.id, result.duration);
}
await browser.close();
