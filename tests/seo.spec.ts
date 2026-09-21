import { expect, test } from '@playwright/test';

const meta = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(`head ${selector}`).getAttribute('content');

test('the page carries the SEO and social metadata', async ({ page, request, baseURL }) => {
  await page.goto('/');

  const description = await meta(page, 'meta[name="description"]');
  expect(description).toMatch(/Ron San Jose/);
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ronsj.dev/',
  );
  expect(await meta(page, 'meta[name="robots"]')).toContain('index');

  expect(await meta(page, 'meta[property="og:type"]')).toBe('website');
  expect(await meta(page, 'meta[property="og:url"]')).toBe('https://ronsj.dev/');
  expect(await meta(page, 'meta[property="og:title"]')).toBe(await page.title());
  expect(await meta(page, 'meta[property="og:description"]')).toBe(description);
  expect(await meta(page, 'meta[property="og:image"]')).toBe('https://ronsj.dev/og.png');
  expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
  expect(await meta(page, 'meta[name="twitter:image"]')).toBe('https://ronsj.dev/og.png');

  // The share image and touch icon must actually be served.
  for (const path of ['/og.png', '/apple-touch-icon.png']) {
    const res = await request.get(`${baseURL}${path}`);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain('image/png');
  }

  const ld = await page.locator('head script[type="application/ld+json"]').textContent();
  const person = JSON.parse(ld ?? '{}');
  expect(person['@type']).toBe('Person');
  expect(person.name).toBe('Ron San Jose');
  expect(person.sameAs).toContain('https://github.com/ronsj');
});
