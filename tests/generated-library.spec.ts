import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const generated: { id: string; name: string }[] = JSON.parse(
  readFileSync("src/data/generated-exercises.json", "utf8"),
);

test("generated library excludes pelvic tilt; descriptions expand and persist independently", async ({
  page,
}) => {
  expect(generated.length).toBeGreaterThanOrEqual(24);
  expect(generated.some((e) => /pelvic|bekkentilt/i.test(e.id + e.name))).toBe(
    false,
  );
  await page.goto("/app");
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await page
    .getByLabel("Samling", { exact: true })
    .selectOption("Hofte og sete");
  await expect(page.locator(".exercise-card")).toHaveCount(5);
  await page.getByLabel("Samling", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Add Seteløft uten strikk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Seteløft uten strikk", exact: true })
    .click();
  const cards = page.locator(".prescription-card");
  await expect(page.getByLabel("Kort beskrivelse")).toHaveCount(0);
  await cards
    .nth(0)
    .getByRole("button", { name: "Vis beskrivelse for Seteløft uten strikk" })
    .click();
  await page.getByLabel("Kort beskrivelse").fill("Min tilpassede beskrivelse.");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await expect(cards).toHaveCount(2);
  await expect(page.getByLabel("Kort beskrivelse")).toHaveCount(0);
  await cards
    .nth(0)
    .getByRole("button", { name: "Vis beskrivelse for Seteløft uten strikk" })
    .click();
  await expect(page.getByLabel("Kort beskrivelse")).toHaveValue(
    "Min tilpassede beskrivelse.",
  );
  await cards
    .nth(1)
    .getByRole("button", { name: "Vis beskrivelse for Seteløft uten strikk" })
    .click();
  await expect(page.getByLabel("Kort beskrivelse")).not.toHaveValue(
    "Min tilpassede beskrivelse.",
  );
  await page.screenshot({
    path: "test-results/generated-library.png",
    fullPage: false,
  });
});

test("the imported machine collection is browsable", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Samling", { exact: true }).selectOption("Apparater");
  await expect(page.locator(".exercise-card")).toHaveCount(16);
  await expect(
    page.getByText("Brystpress i apparat", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ettbens leg extension fra 60 grader"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/machine-collection.png",
    fullPage: false,
  });
});
