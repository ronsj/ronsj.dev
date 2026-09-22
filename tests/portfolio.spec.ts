import { expect, test } from '@playwright/test';
import { activeStage, scrollToStage } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the intro stage', async ({ page }) => {
  await expect(page).toHaveTitle(/Ron San Jose/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ron San Jose' })).toBeVisible();
  await expect(activeStage(page)).toHaveCount(1);
  await expect(page.locator('[data-stage-num]')).toHaveText('01');
});

test('draws particles on the canvas', async ({ page }) => {
  await expect
    .poll(() =>
      page.locator('[data-canvas]').evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext('2d')!;
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let painted = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) painted++;
        return painted;
      }),
    )
    .toBeGreaterThan(1000);
});

test('scrolling steps through every stage', async ({ page }) => {
  const titles = [
    'Ron San Jose',
    'Pixels with purpose.',
    'Selected work.',
    'Developer DNA.',
    'The stack.',
    'Let’s connect.',
  ];
  for (const [i, title] of titles.entries()) {
    await scrollToStage(page, i);
    await expect(activeStage(page).getByRole('heading')).toHaveText(title);
    await expect(activeStage(page).getByRole('heading')).toBeVisible();
    await expect(page.locator('[data-stage-num]')).toHaveText(String(i + 1).padStart(2, '0'));
  }
});

test('Work nav link jumps to selected work', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Work' })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole('heading', { name: 'Selected work.' })).toBeVisible();
});

test('Contact nav link shows contact links', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Contact' })
    .click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
  await expect(activeStage(page).getByRole('button', { name: 'Email' })).toBeVisible();
  const github = page.getByRole('link', { name: /GitHub/ });
  await expect(github).toBeVisible();
  await expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(activeStage(page).getByRole('listitem')).toHaveText([/GitHub/, /LinkedIn/, 'Email']);
});

test('nav links never show a section between the current one and the destination', async ({
  page,
}) => {
  // Record every stage that becomes active, and every counter value, while the smooth scroll is in flight.
  await page.evaluate(() => {
    const seen = { active: [] as number[], counter: [] as string[] };
    const panels = [...document.querySelectorAll('[data-stage]')];
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (el.hasAttribute('data-active')) seen.active.push(panels.indexOf(el));
      }
    }).observe(document.querySelector('[data-text]')!, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active'],
    });
    const counter = document.querySelector('[data-stage-num]')!;
    new MutationObserver(() => {
      const value = counter.textContent ?? '';
      if (seen.counter.at(-1) !== value) seen.counter.push(value);
    }).observe(counter, { childList: true, characterData: true, subtree: true });
    (window as unknown as { seenStages: typeof seen }).seenStages = seen;
  });
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Contact' })
    .click();
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
  // Let the scroll settle before checking what was shown along the way.
  await expect
    .poll(async () => {
      const a = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(200);
      return (await page.evaluate(() => window.scrollY)) === a;
    })
    .toBe(true);
  const seen = await page.evaluate(
    () => (window as unknown as { seenStages: { active: number[]; counter: string[] } }).seenStages,
  );
  expect(seen.active).toEqual([5]);
  expect(seen.counter).toEqual(['06']);
});

test('deep link opens on the matching stage', async ({ page }) => {
  await page.goto('/#contact');
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
});

test('keyboard focus brings an off-screen stage into view', async ({ page }) => {
  await page.getByRole('link', { name: /LinkedIn/ }).focus();
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /LinkedIn/ })).toBeInViewport();
});

test('all stage content stays available to assistive tech', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
  await expect(page.getByRole('region')).toHaveCount(6);
});
