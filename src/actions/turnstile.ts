import { ActionError } from "astro:actions";
import { env } from "cloudflare:workers";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResult {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
  metadata?: { result_with_testing_key?: boolean };
}

/**
 * Canonical Turnstile check: the token must verify, carry the expected action, and have been issued
 * on an allowed frontend hostname. Throws an ActionError the client can show; never call from the browser.
 */
const fail = () =>
  new ActionError({
    code: "FORBIDDEN",
    message: "The verification didn't pass. Please try again.",
  });

export async function requireTurnstile(
  token: string | null | undefined,
  action: string,
  remoteip?: string,
) {
  if (!token) throw fail();

  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );

  // The secret is a Worker secret, not a var, so a deploy can go out without it. Fail loudly instead
  // of letting siteverify answer "missing-input-secret", which would look like every visitor is a bot.
  if (!env.TURNSTILE_SECRET) {
    console.error("Turnstile: TURNSTILE_SECRET is not set");
    throw new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Sorry, the contact form isn't configured correctly. Please try again later.",
    });
  }

  let result: SiteverifyResult;
  try {
    const response = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip }),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = (await response.json()) as SiteverifyResult;
  } catch (cause) {
    console.error("Turnstile: siteverify request failed", cause);
    throw new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Sorry, the verification service isn't responding. Please try again in a moment.",
    });
  }

  // Cloudflare's documented dummy secrets (local dev and tests only) answer without an action; the real
  // secret never sets this flag, so production always enforces the action.
  const testing = result.metadata?.result_with_testing_key === true;
  const actionOk = testing || result.action === action;
  const hostnameOk =
    expectedHostnames.size === 0 || (!!result.hostname && expectedHostnames.has(result.hostname));
  if (!result.success || !actionOk || !hostnameOk) {
    console.warn("Turnstile: rejected", {
      codes: result["error-codes"],
      action: result.action,
      hostname: result.hostname,
    });
    throw fail();
  }
}
