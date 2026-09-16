import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalogue: { name: string; video: string }[] = [
  ...JSON.parse(readFileSync("src/data/exercises.json", "utf8")),
  ...JSON.parse(readFileSync("src/data/generated-exercises.json", "utf8")),
];

test("every bundled video decodes and supports seeking", async ({ page }) => {
  await page.goto("/");
  for (const exercise of catalogue) {
    const result = await page.evaluate(async (src) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = src;
      document.body.append(video);
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error(`Cannot decode ${src}`));
        });
        video.currentTime = Math.min(2, video.duration / 2);
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        return {
          width: video.videoWidth,
          duration: video.duration,
          position: video.currentTime,
        };
      } finally {
        video.remove();
      }
    }, exercise.video);
    expect(result.width, exercise.name).toBeGreaterThan(0);
    expect(result.duration, exercise.name).toBeGreaterThan(0);
    expect(result.position, exercise.name).toBeGreaterThan(0);
  }
});

test("combines tag search, region and equipment and recovers empty results", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search exercises").fill("HINGE");
  await expect(page.locator(".exercise-card")).toHaveCount(1);
  await expect(page.locator(".exercise-card")).toContainText("Deadlift");
  await page.getByRole("button", { name: "Upper body", exact: true }).click();
  await expect(page.getByText("No exercises found")).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".exercise-card")).toHaveCount(catalogue.length);
  await page.getByRole("button", { name: "Trunk", exact: true }).click();
  await page.getByLabel("Filter by equipment").selectOption("Pull-up bar");
  await expect(page.locator(".exercise-card")).toHaveCount(2);
});
