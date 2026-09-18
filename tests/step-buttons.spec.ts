import { expect, test } from "@playwright/test";
import { activeStage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

const group = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Sections" });

test("next and previous buttons step one section at a time", async ({ page }) => {
  const prev = group(page).getByRole("button", { name: "Previous section" });
  const next = group(page).getByRole("button", { name: "Next section" });

  await expect(prev).toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveAttribute("aria-disabled", "false");

  await next.click();
  await expect(activeStage(page).getByRole("heading")).toHaveText("Pixels with purpose.");
  await expect(page.locator("[data-stage-num]")).toHaveText("02");
  await expect(prev).toHaveAttribute("aria-disabled", "false");

  await prev.click();
  await expect(activeStage(page).getByRole("heading")).toHaveText("Ron San Jose");
  await expect(prev).toHaveAttribute("aria-disabled", "true");
});

test("next button becomes inert on the last section but keeps focus", async ({ page }) => {
  const next = group(page).getByRole("button", { name: "Next section" });
  await next.focus();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-stage-num]")).toHaveText(String(i + 2).padStart(2, "0"));
  }
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(next).toBeFocused();

  // A further press must not move or throw.
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-stage-num]")).toHaveText("07");
});

test("section changes are announced to assistive tech", async ({ page }) => {
  const live = page.locator("[data-live]");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toBeEmpty();
  await group(page).getByRole("button", { name: "Next section" }).click();
  await expect(live).toHaveText("Section 2 of 7: Pixels with purpose.");
});
