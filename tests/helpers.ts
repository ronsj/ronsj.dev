import type { Page } from '@playwright/test';

/** Scroll so the section at `stage` (0-based) starts at the top of the viewport. */
export async function scrollToStage(page: Page, stage: number) {
  await page.evaluate((i) => {
    document.querySelectorAll('[data-stage]')[i]!.scrollIntoView({ behavior: 'instant' });
  }, stage);
}

/** The story root; its `data-current` names the section the particles are resting on. */
export const story = (page: Page) => page.locator('[data-story]');
