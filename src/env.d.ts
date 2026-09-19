// Worker secrets aren't declared in wrangler.jsonc, so `wrangler types` only knows about them when a
// local .dev.vars happens to define them. Declare them here so the build type-checks everywhere.
declare namespace Cloudflare {
  interface Env {
    /** Turnstile widget secret, set with `wrangler secret put TURNSTILE_SECRET`. */
    TURNSTILE_SECRET: string;
  }
}
