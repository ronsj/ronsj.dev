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

  expect(await meta(page, 'meta[property="og:image:alt"]')).toBeTruthy();
  expect(await meta(page, 'meta[name="twitter:image:alt"]')).toBeTruthy();

  // Cards only draw when the share image actually loads. It has to be the 1200×630 that X, Bluesky
  // and Facebook all take uncropped, the declared size must match the file (Facebook trusts it on a
  // first share), and it must stay under WhatsApp's 300 KB cap, the tightest of the common platforms.
  const og = await request.get(`${baseURL}/og.png`);
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
  const png = await og.body();
  expect(png.byteLength).toBeLessThan(300_000);
  // A PNG's width and height sit in the IHDR chunk, straight after the 8-byte signature and 8-byte chunk header.
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  expect([width, height]).toEqual([1200, 630]);
  expect(await meta(page, 'meta[property="og:image:width"]')).toBe(String(width));
  expect(await meta(page, 'meta[property="og:image:height"]')).toBe(String(height));

  const icon = await request.get(`${baseURL}/apple-touch-icon.png`);
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toContain('image/png');

  const ld = await page.locator('head script[type="application/ld+json"]').textContent();
  const graph: Record<string, any>[] = JSON.parse(ld ?? '{}')['@graph'];
  const node = (type: string) => graph.find((n) => n['@type'] === type)!;
  const [profile, website, person] = [node('ProfilePage'), node('WebSite'), node('Person')];
  expect(person.name).toBe('Ron San Jose');
  expect(person.sameAs).toContain('https://github.com/ronsj');
  expect(person.knowsAbout).toContain('Astro');
  // The page is about the person, and the site is theirs: both must point at the same node.
  expect(profile.mainEntity['@id']).toBe(person['@id']);
  expect(profile.isPartOf['@id']).toBe(website['@id']);
  expect(website.author['@id']).toBe(person['@id']);
});
