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

## PR previews

CI gives every same-repo PR a [Preview](https://developers.cloudflare.com/workers/previews/) of the Worker (`wrangler preview --name pr-<number>`) and comments the URL on the PR; closing the PR deletes it. Nothing is deployed: production only changes on a push to `main`.

Previews inherit nothing from production, so their vars and bindings live in the `previews` block of `wrangler.jsonc`. Secrets can't, so `TURNSTILE_SECRET` is set once on the Preview base config and new Previews pick it up:

```
wrangler preview base-config secret put TURNSTILE_SECRET
```

The contact form on a Preview uses the real Turnstile widget and sends real mail.

## Contact form

Posts to the `sendEmail` action (`src/actions/`), which checks a honeypot, verifies a Turnstile token, then sends via the `EMAIL` Worker binding.

Production needs:

- Email Routing enabled on the `CONTACT_FROM` zone, with `CONTACT_TO` as a verified destination
- The `TURNSTILE_SECRET` Worker secret (`wrangler secret put`)
- Every hostname in `TURNSTILE_HOSTNAMES` (production's and the `previews` block's) allowed on the Turnstile sitekey; an entry covers its subdomains, so `ronsj1.workers.dev` takes in the PR previews

Locally, email is simulated (written to `.wrangler/tmp/email/`) and Turnstile uses Cloudflare's always-pass test keys from two gitignored files:

```
# .env
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# .dev.vars
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_HOSTNAMES=
```
