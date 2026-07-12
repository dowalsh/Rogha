/**
 * The custom URL scheme this deployment's paired native app registers, used for
 * the auth deep-link round-trip (`<scheme>://auth`).
 *
 * Driven by NEXT_PUBLIC_APP_SCHEME so each environment emits/parses the scheme
 * that its matching iOS build registers (via the CUSTOM_URL_SCHEME build setting):
 *   - production — App Store build registers `rogha://`        -> "rogha" (default)
 *   - staging    — preview build registers `roghapreview://`   -> "roghapreview"
 *
 * Set NEXT_PUBLIC_APP_SCHEME=roghapreview on the staging / Preview Vercel env.
 * Unset (production, local dev) falls back to "rogha", so this is a no-op for prod.
 */
export const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || "rogha";
