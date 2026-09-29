// Renders scripts/og-image.html to public/og.png, the 1200×630 share image. Run with `pnpm og-image`.
import { chromium } from '@playwright/test';

const template = new URL('og-image.html', import.meta.url);
const output = new URL('../public/og.png', import.meta.url);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(template.href);
  await page.evaluate(() => document.fonts.ready);
  // Without the web fonts the image would silently fall back to system fonts.
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family.replaceAll('"', '')),
  );
  const missing = ['DM Mono', 'Manrope', 'Sora'].filter((f) => !loaded.includes(f));
  if (missing.length) throw new Error(`Fonts failed to load: ${missing.join(', ')}`);
  await page.screenshot({ path: output.pathname });
  console.log(`Wrote ${output.pathname}`);
} finally {
  await browser.close();
}
