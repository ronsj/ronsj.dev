import type { Page } from '@playwright/test';

/** The WCAG levels and best practices every axe audit in the suite checks against. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Scroll so the section at `section` (0-based) starts at the top of the viewport. */
export async function scrollToSection(page: Page, section: number) {
  await page.evaluate((i) => {
    document.querySelectorAll('[data-section]')[i]!.scrollIntoView({ behavior: 'instant' });
  }, section);
}

/** The story root; its `data-current` names the section the particles are resting on. */
export const story = (page: Page) => page.locator('[data-story]');

/**
 * The decorative particle canvas sits behind all text, which makes axe report every colour-contrast
 * check as "incomplete". Hide it so text is measured against the page background.
 */
export async function hideCanvas(page: Page) {
  await page.locator('[data-canvas]').evaluate((c: HTMLElement) => (c.style.visibility = 'hidden'));
}
