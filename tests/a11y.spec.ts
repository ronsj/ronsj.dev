import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { scrollToSection, story } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * The decorative particle canvas sits behind all text, which makes axe report every
 * colour-contrast check as "incomplete". Hide it so text is measured against the page
 * background, and fail if any contrast check still can't be determined.
 */
async function audit(page: Page) {
  await page.locator('[data-canvas]').evaluate((c: HTMLElement) => (c.style.visibility = 'hidden'));
  // Chips scrolled past the edge of a horizontal skills row are clipped by the row, so axe can't tell
  // what's behind them and reports them as unmeasurable. They share the visible chips' styles, so skip them.
  await page.evaluate(() => {
    for (const row of document.querySelectorAll<HTMLElement>('[data-drag-scroll]')) {
      const box = row.getBoundingClientRect();
      for (const chip of row.children) {
        const r = chip.getBoundingClientRect();
        if (r.left < box.left || r.right > box.right) chip.setAttribute('data-axe-skip', '');
      }
    }
  });
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude('header')
    .exclude('[data-axe-skip]')
    .analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);

  // On narrow screens the header sits on a white-to-transparent gradient, which axe can't measure.
  // Its dark text has the least contrast against the page background at the transparent end, so
  // check that worst case by measuring with the gradient removed.
  await page.locator('header').evaluate((h: HTMLElement) => (h.style.backgroundImage = 'none'));
  const header = await new AxeBuilder({ page }).withTags(TAGS).include('header').analyze();
  expect(header.violations).toEqual([]);
  expect(header.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);
}

for (const [section, name] of [
  [0, 'intro'],
  [4, 'skills'],
  [5, 'contact'],
] as const) {
  test(`no axe violations with the ${name} section on screen`, async ({ page }) => {
    await page.goto('/');
    await scrollToSection(page, section);
    await expect(story(page)).toHaveAttribute('data-current', name);
    await audit(page);
  });
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('still tracks the current section', async ({ page }) => {
    await page.goto('/');
    await scrollToSection(page, 1);
    await expect(story(page)).toHaveAttribute('data-current', 'about');
    await expect(page.getByRole('heading', { name: 'Pixels with purpose.' })).toBeInViewport();
    await audit(page);
  });
});
