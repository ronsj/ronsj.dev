import { expect, test } from "@playwright/test";
import { activeStage, scrollToStage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the intro stage", async ({ page }) => {
  await expect(page).toHaveTitle(/Ron San Jose/);
  await expect(page.getByRole("heading", { level: 1, name: "Ron San Jose" })).toBeVisible();
  await expect(activeStage(page)).toHaveCount(1);
  await expect(page.locator("[data-stage-num]")).toHaveText("01");
});

test("draws particles on the canvas", async ({ page }) => {
  await expect
    .poll(() =>
      page.locator("[data-canvas]").evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext("2d")!;
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let painted = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) painted++;
        return painted;
      }),
    )
    .toBeGreaterThan(1000);
});

test("scrolling steps through every stage", async ({ page }) => {
  const titles = [
    "Ron San Jose",
    "Pixels with purpose.",
    "Selected work.",
    "Developer DNA.",
    "In the open.",
    "The stack.",
    "Let’s connect.",
  ];
  for (const [i, title] of titles.entries()) {
    await scrollToStage(page, i);
    await expect(activeStage(page).getByRole("heading")).toHaveText(title);
    await expect(activeStage(page).getByRole("heading")).toBeVisible();
    await expect(page.locator("[data-stage-num]")).toHaveText(String(i + 1).padStart(2, "0"));
  }
});

test("Work nav link jumps to selected work", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Work" })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole("heading", { name: "Selected work." })).toBeVisible();
});

test("Contact nav link shows contact links", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Contact" })
    .click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole("heading", { name: "Let’s connect." })).toBeVisible();
  await expect(page.getByRole("link", { name: "ronsj1@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:ronsj1@gmail.com",
  );
  const github = page.getByRole("link", { name: /GitHub/ });
  await expect(github).toBeVisible();
  await expect(github).toHaveAttribute("rel", "noopener noreferrer");
  await expect(activeStage(page).getByRole("listitem").getByRole("link")).toHaveText([
    /GitHub/,
    /LinkedIn/,
    "ronsj1@gmail.com",
  ]);
});

test("deep link opens on the matching stage", async ({ page }) => {
  await page.goto("/#contact");
  await expect(page.getByRole("heading", { name: "Let’s connect." })).toBeVisible();
});

test("keyboard focus brings an off-screen stage into view", async ({ page }) => {
  await page.getByRole("link", { name: "ronsj1@gmail.com" }).focus();
  await expect(page.getByRole("heading", { name: "Let’s connect." })).toBeVisible();
  await expect(page.getByRole("link", { name: "ronsj1@gmail.com" })).toBeInViewport();
});

test("all stage content stays available to assistive tech", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  await expect(page.getByRole("region")).toHaveCount(7);
});
