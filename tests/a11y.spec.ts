import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { AXE_TAGS, hideCanvas, scrollToSection, story } from './helpers';

/** Audit the whole page, failing if any colour-contrast check can't be determined either. */
async function audit(page: Page) {
  await hideCanvas(page);
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
    .withTags(AXE_TAGS)
    .exclude('header')
    .exclude('[data-axe-skip]')
    .analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);

  // On narrow screens the header sits on a white-to-transparent gradient, which axe can't measure.
  // Its dark text has the least contrast against the page background at the transparent end, so
  // check that worst case by measuring with the gradient removed.
  await page.locator('header').evaluate((h: HTMLElement) => (h.style.backgroundImage = 'none'));
  const header = await new AxeBuilder({ page }).withTags(AXE_TAGS).include('header').analyze();
  expect(header.violations).toEqual([]);
  expect(header.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);
}

// Every section is in the DOM at once, so one audit covers the whole page.
test('no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(story(page)).toHaveAttribute('data-current', 'intro');
  await audit(page);
});

test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the system preference and has no axe violations', async ({ page }) => {
    // The default mode is light, so opt into following the system before the page loads.
    await page.addInitScript(() => localStorage.setItem('theme', 'auto'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(story(page)).toHaveAttribute('data-current', 'intro');
    await audit(page);
  });
});

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
