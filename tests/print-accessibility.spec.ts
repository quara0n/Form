import { test, expect } from "@playwright/test";

test("native print blocks invalid drafts and prints current accessible custom values", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-only")).toContainText(
    "Add an exercise before printing.",
  );
  await expect(page.locator(".print-only .handout-exercise")).toHaveCount(0);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page.getByLabel("Reps", { exact: true }).fill("12-8");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-only")).toContainText(
    "Programme not ready to print",
  );
  await expect(page.locator(".print-only")).toContainText("Exercise 1, Reps");
  await expect(page.locator(".print-only .handout-exercise")).toHaveCount(0);
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel("Reps", { exact: true }).fill("8-12");
  await page.getByLabel("Add parameter to exercise 1").selectOption("custom");
  await page.getByLabel("Custom parameter name for exercise 1").fill("Band");
  await page
    .getByRole("textbox", { name: "Band value for exercise 1", exact: true })
    .fill("Green");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-only .handout-exercise")).toHaveCount(1);
  await expect(page.locator(".print-only")).toContainText("8–12 reps / set");
  await expect(page.locator(".print-only")).toContainText("Band: Green");
});
