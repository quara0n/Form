import { test, expect } from "@playwright/test";

test("forsiden leder til arbeidsflaten", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Treningsprogrammer/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/form-landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Åpne Form Rehab" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: /Mitt program/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Øvelsesbibliotek" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add Seteløft uten strikk", exact: true })
    .click();
  await page.screenshot({ path: "test-results/form-workspace-desktop.png" });
});

test("forsiden er lesbar på mobil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Åpne Form Rehab" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/form-landing-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
