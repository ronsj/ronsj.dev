// Worker secrets aren't declared in wrangler.jsonc, so `wrangler types` only knows about them when a
// local .dev.vars happens to define them. Declare them here so the build type-checks everywhere.
// `wrangler types` emits both `Cloudflare.Env` and a global `Env`, so patch both. Keep this in step
// with the secret's name on the Worker and in .dev.vars; nothing checks that they match.
interface WorkerSecrets {
  /** Turnstile widget secret, set with `wrangler secret put TURNSTILE_SECRET`. */
  TURNSTILE_SECRET: string;
}

declare namespace Cloudflare {
  interface Env extends WorkerSecrets {}
}

interface Env extends WorkerSecrets {}
