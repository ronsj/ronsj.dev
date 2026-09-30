# ronsj.dev

My single-page portfolio. Astro, React, Tailwind v4, deployed as a Cloudflare Worker.

## Scripts

| Command         | What it does                                           |
| --------------- | ------------------------------------------------------ |
| `pnpm dev`      | Dev server at http://localhost:4321                    |
| `pnpm build`    | Type-check and build                                   |
| `pnpm preview`  | Serve the build                                        |
| `pnpm lint`     | Oxlint (`lint:fix` to autofix)                         |
| `pnpm format`   | Oxfmt (`format:check` to check only)                   |
| `pnpm test:e2e` | Playwright + axe, desktop and mobile                   |
| `pnpm og-image` | Render `scripts/og-image.html` to `public/og.png`      |
| `pnpm types`    | Regenerate Worker types after editing `wrangler.jsonc` |

Lefthook runs Oxlint and Oxfmt on staged files before each commit.

## Contact form

Posts to the `sendEmail` action (`src/actions/`), which checks a honeypot, verifies a Turnstile token, then sends via the `EMAIL` Worker binding.

Production needs:

- Email Routing enabled on the `CONTACT_FROM` zone, with `CONTACT_TO` as a verified destination
- The `TURNSTILE_SECRET` Worker secret (`wrangler secret put`)
- Every hostname in `TURNSTILE_HOSTNAMES` allowed on the Turnstile sitekey

Locally, email is simulated (written to `.wrangler/tmp/email/`) and Turnstile uses Cloudflare's always-pass test keys from two gitignored files:

```
# .env
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# .dev.vars
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_HOSTNAMES=
```
