import { test, expect } from "@playwright/test";

test("edits made while a save is pending survive completion and reload", async ({
  page,
}) => {
  // Hold the first repository promise after the real transaction commits.
  // This deterministically exercises the hook's in-flight save/version logic.
  await page.route("**/src/storage/programmeRepository.ts*", async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace(
      "export async function saveProgramme(",
      "async function originalSaveProgramme(",
    );
    await route.fulfill({
      response,
      body:
        source +
        `
      let held = false;
      export async function saveProgramme(programme) {
        const saved = await originalSaveProgramme(programme);
        if (!held) {
          held = true;
          await new Promise(resolve => { window.releaseTestSave = resolve; });
        }
        return saved;
      }
    `,
    });
  });
  await page.goto("/app");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page.waitForFunction(
    () => typeof (window as any).releaseTestSave === "function",
  );
  await expect(page.getByText("Saving…", { exact: true })).toBeVisible();
  await page.getByLabel("Sets", { exact: true }).fill("4");
  await page
    .getByLabel("Notes for exercise 1")
    .fill("Latest edit during pending save");
  await page.evaluate(() => (window as any).releaseTestSave());
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.unroute("**/src/storage/programmeRepository.ts*");
  await page.reload();
  await expect(page.getByLabel("Sets", { exact: true })).toHaveValue("4");
  await expect(page.getByLabel("Notes for exercise 1")).toHaveValue(
    "Latest edit during pending save",
  );
});
