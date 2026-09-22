import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { AXE_TAGS, hideCanvas } from './helpers';

const openWork = async (page: Page) => {
  await page.goto('/#work');
  const work = page.locator('#work');
  // The accordion hydrates once the section is on screen; Astro drops `ssr` from the island when it has.
  await expect(work.locator('astro-island')).not.toHaveAttribute('ssr');
  return work;
};

test('each project expands to its description and closes the one before', async ({ page }) => {
  const work = await openWork(page);
  const peets = work.getByRole('button', { name: /Peet's Coffee/ });
  const syrn = work.getByRole('button', { name: /SYRN/ });
  const buttons = work.getByRole('button');
  await expect(buttons).toHaveCount(3);
  for (const b of await buttons.all()) await expect(b).toHaveAttribute('aria-expanded', 'false');
  // Closed panels are inert, so their links are out of the tab order and the accessibility tree.
  await expect(work.locator('[inert]')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /Visit Peet's Coffee/ })).toBeHidden();

  await peets.click();
  await expect(peets).toHaveAttribute('aria-expanded', 'true');
  // An attribute selector, because React's generated ids can hold characters a #id selector can't.
  const panel = work.locator(`[id="${await peets.getAttribute('aria-controls')}"]`);
  await expect(panel).not.toHaveAttribute('inert');
  await expect(panel.getByText(/I built theme sections/)).toBeVisible();
  const visit = panel.getByRole('link', { name: /Visit Peet's Coffee/ });
  await expect(visit).toHaveAttribute('href', 'https://peets.com');
  await expect(visit).toHaveAttribute('rel', 'noopener noreferrer');

  await syrn.click();
  await expect(syrn).toHaveAttribute('aria-expanded', 'true');
  await expect(peets).toHaveAttribute('aria-expanded', 'false');
  await expect(panel.getByText(/I built theme sections/)).toBeHidden();

  await syrn.click();
  await expect(syrn).toHaveAttribute('aria-expanded', 'false');
});

test('arrow keys move between project headers', async ({ page }) => {
  const work = await openWork(page);
  const peets = work.getByRole('button', { name: /Peet's Coffee/ });
  await peets.focus();
  await page.keyboard.press('ArrowDown');
  await expect(work.getByRole('button', { name: /SYRN/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(work.getByRole('button', { name: /Barnes & Noble/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(work.getByRole('button', { name: /Barnes & Noble/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(peets).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(peets).toHaveAttribute('aria-expanded', 'true');
});

test('the open accordion has no axe violations', async ({ page }) => {
  const work = await openWork(page);
  await work.getByRole('button', { name: /Barnes & Noble/ }).click();
  await expect(page.getByRole('link', { name: /Visit Barnes & Noble/ })).toBeVisible();
  await hideCanvas(page);
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).include('#work').analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);
});
