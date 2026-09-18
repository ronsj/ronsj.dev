import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { activeStage, scrollToStage } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * The decorative particle canvas sits behind all text, which makes axe report every
 * colour-contrast check as "incomplete". Hide it so text is measured against the page
 * background, and fail if any contrast check still can't be determined.
 */
async function audit(page: Page) {
  await page.locator("[data-canvas]").evaluate((c: HTMLElement) => (c.style.visibility = "hidden"));
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter((r) => r.id === "color-contrast")).toEqual([]);
}

for (const [stage, name] of [
  [0, "intro"],
  [2, "stack"],
  [6, "contact"],
] as const) {
  test(`no axe violations on the ${name} stage`, async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, stage);
    await expect(activeStage(page)).toHaveAttribute("aria-labelledby", `${name}-title`);
    // Let the text fade-in finish so axe measures final colours.
    await expect(page.locator("[data-text]")).toHaveCSS("opacity", "1");
    await audit(page);
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("swaps stages without waiting on the fade", async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, 1);
    await expect(page.getByRole("heading", { name: "Pixels with purpose." })).toBeVisible();
    await audit(page);
  });
});
