# Ron San Jose — Portfolio

Single-page portfolio website.

## Stack

Astro + TypeScript, React, Tailwind CSS v4, Oxlint, Oxfmt, Lefthook, Playwright.

## Scripts

| Command         | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `pnpm dev`      | Dev server at http://localhost:4321                        |
| `pnpm build`    | Type-check (`astro check`) and build to `dist/`            |
| `pnpm preview`  | Serve the built site                                       |
| `pnpm lint`     | Oxlint (`lint:fix` to autofix)                             |
| `pnpm format`   | Oxfmt (`format:check` in CI)                               |
| `pnpm test:e2e` | Build, serve, and run Playwright + axe on desktop & mobile |

Lefthook runs Oxlint and Oxfmt on staged files before each commit. Hooks install on `pnpm install` once the folder is a git repo (or run `pnpm exec lefthook install`).

## Where things live

- `src/data/*.ts` — all copy: section text, list items, contact links
- `src/components/sections/` — one component per section, in `index.ts` order
- `src/components/ProjectAccordion.tsx` — the Work projects as a React accordion, hydrated on scroll
- `src/components/PageContainer.astro` — the page: fixed canvas, `Header.astro`, the sections, `ContactFormDialog.astro`
- `src/scripts/shapes.ts` — particle target shapes
- `src/scripts/particles.ts` — canvas renderer (projection, timed morphing, intro fly-in)
- `src/scripts/sections.ts` — which section covers most of the viewport → particle shape, nav jumps
- `src/styles/global.css` — design tokens (`@theme`) and their dark-theme values
- `src/scripts/theme.ts` — the light/dark toggle; the theme follows the system until the header button sets one

## Contact form email

The "Email" button on the contact section opens a form that posts to the `sendEmail` Astro Action (`src/actions/index.ts`). The action sends the message through Cloudflare's `send_email` Worker binding, declared in `wrangler.jsonc` as `EMAIL`, to the address in the `CONTACT_TO` var.

For sending to work in production, the Cloudflare account needs:

- **Email Routing enabled** on the zone that `CONTACT_FROM` belongs to (`contact@ronsj.dev` by
  default; the sender must be an address on that zone).
- **`CONTACT_TO` verified as a destination address** in Email Routing. The binding's
  `destination_address` restricts sending to that one address.

In `astro dev` and `astro preview`, workerd simulates the binding: nothing is delivered, the message is logged and its body written under `.wrangler/tmp/email/`.

Run `pnpm types` (or any of `dev`, `build`, `check`, which run it first) to regenerate
`worker-configuration.d.ts` after changing `wrangler.jsonc`.

## Contact form bot protection (Turnstile)

The contact form is protected by a Cloudflare Turnstile widget (sitekey `0x4AAAAAAE8wGzGjBwHSydBN`, registered for `ronsj.dev` and `ronsj-dev.ronsj1.workers.dev`). The widget script loads only when the dialog opens, and the Send button stays disabled until the widget issues a token. The `sendEmail` action verifies that token with
Cloudflare's siteverify (`src/actions/turnstile.ts`) before sending anything (only the honeypot check runs earlier, so bots that trip it get a quiet success without a siteverify call): it must succeed, carry the action `contact`, and report a hostname listed in the `TURNSTILE_HOSTNAMES` var.

- **Production:** the widget secret is the `TURNSTILE_SECRET` secret on the `ronsj-dev` Worker (set with `wrangler secret put`, never committed). `TURNSTILE_HOSTNAMES` lists `ronsj.dev` and the `ronsj-dev.ronsj1.workers.dev` preview hostname; both must also be allowed domains on the sitekey, or the widget never issues a token there.
- **Local dev and tests:** Cloudflare's documented dummy keys are used instead, so nothing here needs the real secret: `.env` sets `PUBLIC_TURNSTILE_SITE_KEY` to the always-pass sitekey and `.dev.vars` sets `TURNSTILE_SECRET` to the always-pass secret with an empty hostname list. Both files are gitignored; recreate them from the snippets below if they're missing.

```
# .env
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# .dev.vars
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_HOSTNAMES=
```
