import { expect, test } from '@playwright/test';
import { scrollToStage, story } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the intro section', async ({ page }) => {
  await expect(page).toHaveTitle(/Ron San Jose/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ron San Jose' })).toBeInViewport();
  await expect(story(page)).toHaveAttribute('data-current', 'intro');
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

test('the section covering most of the viewport becomes current', async ({ page }) => {
  const sections = [
    ['intro', 'Ron San Jose'],
    ['about', 'Pixels with purpose.'],
    ['work', 'Selected work.'],
    ['experience', 'Developer DNA.'],
    ['skills', 'The stack.'],
    ['contact', 'Let’s connect.'],
  ] as const;
  for (const [i, [id, title]] of sections.entries()) {
    await scrollToStage(page, i);
    await expect(page.locator(`#${id}-title`)).toHaveText(title);
    await expect(page.locator(`#${id}-title`)).toBeInViewport();
    await expect(story(page)).toHaveAttribute('data-current', id);
  }
});

test('the current section follows the scroll position, not just section starts', async ({
  page,
}) => {
  // Scroll to a point where the about section fills most of the viewport but starts below its top.
  await page.evaluate(() => {
    const about = document.querySelector<HTMLElement>('#about')!;
    window.scrollTo({ top: about.offsetTop - window.innerHeight * 0.3, behavior: 'instant' });
  });
  await expect(story(page)).toHaveAttribute('data-current', 'about');
  await page.evaluate(() => {
    const about = document.querySelector<HTMLElement>('#about')!;
    window.scrollTo({ top: about.offsetTop - window.innerHeight * 0.7, behavior: 'instant' });
  });
  await expect(story(page)).toHaveAttribute('data-current', 'intro');
});

test('Work nav link jumps to selected work', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Work' })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole('heading', { name: 'Selected work.' })).toBeInViewport();
  await expect(story(page)).toHaveAttribute('data-current', 'work');
});

test('Contact nav link shows contact links', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Contact' })
    .click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeInViewport();
  const contact = page.locator('#contact');
  await expect(contact.getByRole('button', { name: 'Email' })).toBeInViewport();
  const github = page.getByRole('link', { name: /GitHub/ });
  await expect(github).toBeInViewport();
  await expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(contact.getByRole('listitem')).toHaveText([/GitHub/, /LinkedIn/, 'Email']);
});

test('nav jumps morph straight to the destination, skipping the sections in between', async ({
  page,
}) => {
  // Record every section that becomes current while the smooth scroll is in flight.
  await page.evaluate(() => {
    const seen: string[] = [];
    const root = document.querySelector<HTMLElement>('[data-story]')!;
    new MutationObserver(() => seen.push(root.dataset.current ?? '')).observe(root, {
      attributes: true,
      attributeFilter: ['data-current'],
    });
    (window as unknown as { seenSections: string[] }).seenSections = seen;
  });
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Contact' })
    .click();
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeInViewport();
  // Let the scroll settle before checking what was shown along the way.
  await expect
    .poll(async () => {
      const a = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(200);
      return (await page.evaluate(() => window.scrollY)) === a;
    })
    .toBe(true);
  const seen = await page.evaluate(
    () => (window as unknown as { seenSections: string[] }).seenSections,
  );
  expect(seen).toEqual(['contact']);
});

test('deep link opens on the matching section', async ({ page }) => {
  await page.goto('/#contact');
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeInViewport();
  await expect(story(page)).toHaveAttribute('data-current', 'contact');
});

test('keyboard focus brings an off-screen section into view', async ({ page }) => {
  await page.getByRole('link', { name: /LinkedIn/ }).focus();
  await expect(page.getByRole('link', { name: /LinkedIn/ })).toBeInViewport();
});

test('every section is a labelled region', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
  await expect(page.getByRole('region')).toHaveCount(6);
});
