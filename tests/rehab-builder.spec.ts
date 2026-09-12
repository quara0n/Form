import { test, expect } from "@playwright/test";
test("builds independent prescriptions, persists them and prints current data", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page.getByRole("button", { name: "Preview & print" }).click();
  await expect(
    page.getByRole("alert").getByText("Add an exercise before printing."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss print errors" }).click();
  await page.getByLabel("Search exercises").fill("squat");
  await expect(page.locator(".exercise-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  const first = page.locator(".prescription-card").nth(0);
  const second = page.locator(".prescription-card").nth(1);
  await first.getByLabel("Sets", { exact: true }).fill("3");
  await first.getByLabel("Reps", { exact: true }).fill("8-12");
  await first.getByLabel("Add parameter to exercise 1").selectOption("load");
  await first.getByLabel("Load", { exact: true }).fill("7,5");
  await second.getByLabel("Sets", { exact: true }).fill("2");
  await second
    .getByLabel("Add parameter to exercise 2")
    .selectOption("duration");
  await second.getByLabel("Duration", { exact: true }).fill("30");
  await expect(first.getByLabel("Sets", { exact: true })).toHaveValue("3");
  await page.getByLabel("PROGRAMME NAME").fill("Return to movement");
  await first.getByLabel("Add parameter to exercise 1").selectOption("custom");
  await first.getByLabel("Custom parameter name for exercise 1").fill("Band");
  await first.locator(".parameter.custom .parameter-input input").fill("Green");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("PROGRAMME NAME")).toHaveValue(
    "Return to movement",
  );
  await expect(page.locator(".prescription-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Move exercise 2 up" }).click();
  await expect(
    page
      .locator(".prescription-card")
      .first()
      .getByLabel("Sets", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Remove exercise 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".prescription-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Preview & print" }).click();
  const preview = page.getByRole("dialog", { name: "Programme preview" });
  await expect(preview).toContainText("7.5 kg");
  await expect(preview).toContainText("Band: Green");
  await expect(preview).toContainText("30 sec / set");
  await page.screenshot({ path: "test-results/programme-preview.png" });
  await page.pdf({ path: "test-results/programme.pdf", format: "A4" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "New programme", exact: true })
    .click();
  await expect(page.locator(".prescription-card")).toHaveCount(0);
  await page.getByRole("button", { name: "My programmes" }).click();
  await page
    .getByRole("button", { name: /Return to movement.*2 exercises/ })
    .click();
  await expect(page.locator(".prescription-card")).toHaveCount(2);
});
test("validates input, handles video failure and keyboard preview", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page
    .getByRole("button", { name: "Preview Squat", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Squat", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Preview Squat", exact: true }),
  ).toBeFocused();
  await page.route("**/exercises/row.webm", (r) => r.abort());
  await page.getByRole("button", { name: "Preview Bent-over row" }).click();
  await expect(page.getByText("This video couldn’t load")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page.getByLabel("Reps", { exact: true }).fill("12-8");
  await page.getByRole("button", { name: "Preview & print" }).click();
  await expect(page.getByText("One quick check before printing")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("mobile workspace retains programme and has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Add Squat", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Squat", exact: true }).click();
  await page
    .locator(".mobile-switch")
    .getByRole("button", { name: /Programme/ })
    .click();
  await expect(page.locator(".prescription-card")).toBeVisible();
  await page.getByLabel("Sets", { exact: true }).fill("4");
  await page
    .locator(".mobile-switch")
    .getByRole("button", { name: "Exercise library" })
    .click();
  await page
    .locator(".mobile-switch")
    .getByRole("button", { name: /Programme/ })
    .click();
  await expect(page.getByLabel("Sets", { exact: true })).toHaveValue("4");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("desktop library and all media render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".exercise-card")).toHaveCount(12);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  for (const img of await page.locator(".exercise-image img").all()) {
    await expect(img).toHaveJSProperty("complete", true);
    expect(
      await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
  }
});
