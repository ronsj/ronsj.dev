import type { Page } from '@playwright/test';

/** Scroll so the section at `section` (0-based) starts at the top of the viewport. */
export async function scrollToSection(page: Page, section: number) {
  await page.evaluate((i) => {
    document.querySelectorAll('[data-section]')[i]!.scrollIntoView({ behavior: 'instant' });
  }, section);
}

/** The story root; its `data-current` names the section the particles are resting on. */
export const story = (page: Page) => page.locator('[data-story]');
