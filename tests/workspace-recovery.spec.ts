import { test, expect } from "@playwright/test";

test("retains conflicting edits as a copy and confirms deletion", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page.getByLabel("PROGRAMME NAME").fill("Shared draft");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByLabel("PROGRAMME NAME")).toHaveValue("Shared draft");
  await page.getByLabel("Sets", { exact: true }).fill("3");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await second.getByLabel("Sets", { exact: true }).fill("5");
  await expect(second.getByText("Changes not saved")).toBeVisible();
  await expect(second.getByLabel("Sets", { exact: true })).toHaveValue("5");
  await second
    .getByRole("button", { name: "Save as a copy", exact: true })
    .click();
  await expect(second.getByText("Saved on this device")).toBeVisible();
  await expect(second.getByLabel("PROGRAMME NAME")).toHaveValue(
    "Shared draft (copy)",
  );
  await page.reload();
  await page.getByRole("button", { name: "My programmes" }).click();
  await page
    .locator(".saved-name")
    .filter({ hasText: "Shared draft" })
    .filter({ hasNotText: "(copy)" })
    .click();
  await expect(page.getByLabel("Sets", { exact: true })).toHaveValue("3");
  await second.getByRole("button", { name: "My programmes" }).click();
  await second
    .getByRole("button", { name: "Delete Shared draft (copy)", exact: true })
    .click();
  await second.getByRole("button", { name: "Keep programme" }).click();
  await expect(
    second.getByRole("button", {
      name: "Delete Shared draft (copy)",
      exact: true,
    }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Delete Shared draft (copy)", exact: true })
    .click();
  await second
    .getByRole("button", { name: "Delete programme", exact: true })
    .click();
  await expect(
    second.getByRole("button", {
      name: "Delete Shared draft (copy)",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(second.locator(".saved-name")).toHaveCount(1);
});

test("prints five mixed exercises with long notes and all parameter types", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  for (const name of [
    "Squat",
    "Bent-over row",
    "Bench press",
    "Deadlift",
    "Biceps curl",
  ]) {
    await page
      .getByRole("button", { name: `Add ${name}`, exact: true })
      .click();
  }
  const card = page.locator(".prescription-card").first();
  for (const [key, label, value] of [
    ["duration", "Duration", "2"],
    ["load", "Load", "0"],
    ["hold", "Hold", "5"],
    ["rest", "Rest", "60"],
    ["frequency", "Frequency", "Every other day"],
    ["side", "Side", "Both"],
    ["tempo", "Tempo / effort", "3-1-2"],
  ]) {
    await card.getByLabel("Add parameter to exercise 1").selectOption(key);
    if (key === "side")
      await card.getByLabel(label, { exact: true }).selectOption(value);
    else await card.getByLabel(label, { exact: true }).fill(value);
  }
  const note = "Keep the prescribed movement controlled. ".repeat(40);
  await page.getByLabel("Notes for exercise 1").fill(note);
  await page
    .getByLabel("Programme instructions")
    .fill("Programme instructions retained across printing.");
  await page.getByRole("button", { name: "Preview & print" }).click();
  const preview = page.getByRole("dialog", { name: "Programme preview" });
  await expect(preview.locator(".handout-exercise")).toHaveCount(5);
  for (const value of [
    "0 kg",
    "5 sec / rep",
    "60 sec rest",
    "Every other day",
    "Both",
    "3–1-2",
  ]) {
    await expect(preview).toContainText(value);
  }
  await expect(preview.locator(".handout-note")).toHaveText(note.trim());
  await page.pdf({ path: "test-results/five-exercises.pdf", format: "A4" });
});
