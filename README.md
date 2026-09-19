# Ron San Jose — Portfolio

Single-page, scroll-driven portfolio. A sticky canvas of 5,000 particles morphs through seven shapes
(cloud → sphere → orbits → DNA helix → wave → layers → spiral galaxy) while the copy steps through seven stages.

## Stack

Astro + TypeScript, Tailwind CSS v4, Oxlint, Oxfmt, Lefthook, Playwright + axe-core.

## Scripts

| Command         | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `pnpm dev`      | Dev server at http://localhost:4321                        |
| `pnpm build`    | Type-check (`astro check`) and build to `dist/`            |
| `pnpm preview`  | Serve the built site                                       |
| `pnpm lint`     | Oxlint (`lint:fix` to autofix)                             |
| `pnpm format`   | Oxfmt (`format:check` in CI)                               |
| `pnpm test:e2e` | Build, serve, and run Playwright + axe on desktop & mobile |

Lefthook runs Oxlint and Oxfmt on staged files before each commit. Hooks install on `pnpm install`
once the folder is a git repo (or run `pnpm exec lefthook install`).

## Where things live

- `src/data/stages.ts` — all copy: stage text, list items, contact links
- `src/components/ParticleStory.astro` — markup for the sticky scene
- `src/scripts/shapes.ts` — particle target shapes
- `src/scripts/particles.ts` — canvas renderer (projection, morphing, intro fly-in)
- `src/scripts/stages.ts` — scroll → stage mapping, text swap, nav jumps, focus handling
- `src/styles/global.css` — design tokens (`@theme`)

## Contact form email

The "Email" button on the contact section opens a form that posts to the `sendEmail` Astro Action
(`src/actions/index.ts`). The action sends the message through Cloudflare's `send_email` Worker
binding, declared in `wrangler.jsonc` as `EMAIL`, to the address in the `CONTACT_TO` var.

For sending to work in production, the Cloudflare account needs:

- **Email Routing enabled** on the zone that `CONTACT_FROM` belongs to (`contact@ronsj.dev` by
  default; the sender must be an address on that zone).
- **`CONTACT_TO` verified as a destination address** in Email Routing. The binding's
  `destination_address` restricts sending to that one address.

In `astro dev` and `astro preview`, workerd simulates the binding: nothing is delivered, the message
is logged and its body written under `.wrangler/tmp/email/`.

Run `pnpm types` (or any of `dev`, `build`, `check`, which run it first) to regenerate
`worker-configuration.d.ts` after changing `wrangler.jsonc`.
