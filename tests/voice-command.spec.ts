import { test, expect } from "@playwright/test";

test("a spoken command fills the rehab builder with exercises and dosage", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.getByRole("button", { name: "Tale til program" }).click();
  await expect(page.getByLabel("Skriv kommando")).toBeVisible();
  const speechApi = await page.evaluate(() =>
    Boolean(
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition,
    ),
  );
  expect(speechApi, "Chrome exposes the Web Speech API").toBe(true);
  await expect(
    page.getByRole("button", { name: "Start talestyring" }),
  ).toBeVisible();
  await expect(page.locator(".voice-engine")).toContainText("Lydmotor:");
  await page.screenshot({ path: "test-results/voice-panel.png" });
  await page
    .getByLabel("Skriv kommando")
    .fill(
      "Brystpress, nedtrekk, beinpress og flyes 3 x 10 reps, 2 min pause mellom settene",
    );
  await page.getByRole("button", { name: "Bruk kommando" }).click();

  const cards = page.locator(".prescription-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText("Brystpress i apparat");
  await expect(cards.nth(1)).toContainText("Nedtrekk til bryst i apparat");
  await expect(cards.nth(2)).toContainText("Benpress i apparat");
  await expect(cards.nth(3)).toContainText("Flyes i apparat");

  const last = page.getByLabel("Exercise 4: Flyes i apparat");
  await expect(last.getByLabel("Sets", { exact: true })).toHaveValue("3");
  await expect(last.getByLabel("Reps", { exact: true })).toHaveValue("10");
  await expect(last.getByLabel("Rest", { exact: true })).toHaveValue("120");
  await expect(page.locator(".voice-outcome")).toContainText(
    "4 øvelser lagt til i programmet",
  );
  await page.screenshot({ path: "test-results/voice-applied.png" });
});

test("the Ctrl+Space hotkey opens the voice panel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.keyboard.press("Control+Space");
  await expect(page.getByLabel("Skriv kommando")).toBeVisible();
  await page.keyboard.press("Control+Space");
  await expect(page.getByLabel("Skriv kommando")).toBeHidden();
});

test("understands misspelled free speech and keeps the exercise order", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.getByRole("button", { name: "Tale til program" }).click();
  await page
    .getByLabel("Skriv kommando")
    .fill(
      "jeg trenger benpres og bryst pres først, også nedrek til bryst, 3 x 10 reps og 2 min pause mellom settene",
    );
  await page.getByRole("button", { name: "Bruk kommando" }).click();

  const cards = page.locator(".prescription-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Benpress i apparat");
  await expect(cards.nth(1)).toContainText("Brystpress i apparat");
  await expect(cards.nth(2)).toContainText("Nedtrekk til bryst i apparat");
  await expect(cards.nth(0).getByLabel("Sets", { exact: true })).toHaveValue(
    "3",
  );
  await expect(cards.nth(0).getByLabel("Reps", { exact: true })).toHaveValue(
    "10",
  );
  await expect(cards.nth(0).getByLabel("Rest", { exact: true })).toHaveValue(
    "120",
  );
  await expect(page.locator(".voice-outcome")).toContainText(
    "3 øvelser lagt til i programmet",
  );
});
