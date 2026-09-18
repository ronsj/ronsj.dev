import type { Page } from "@playwright/test";

/** Scroll so the story's progress lands exactly on `stage` (0-based). */
export async function scrollToStage(page: Page, stage: number) {
  await page.evaluate((i) => {
    const root = document.querySelector<HTMLElement>("[data-story]")!;
    const last = root.querySelectorAll("[data-stage]").length - 1;
    const max = root.offsetHeight - window.innerHeight;
    window.scrollTo({ top: root.offsetTop + (max * i) / last, behavior: "instant" });
  }, stage);
}

export const activeStage = (page: Page) => page.locator("[data-stage][data-active]");
