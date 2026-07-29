/**
 * Derives Clerk's hosted Account Portal URL (password/email/session
 * management) from the public publishable key, so we don't need a separate
 * env var to keep in sync. Publishable keys encode the Frontend API host as
 * base64("<frontend-api-host>$") after the `pk_test_`/`pk_live_` prefix —
 * the Account Portal lives at the same host with `clerk.` swapped for
 * `accounts.` (or `accounts.` prepended if there's no `clerk.` prefix).
 */
export function getClerkAccountPortalUrl(): string | null {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return null;

  const parts = pk.split("_");
  const encoded = parts[2];
  if (!encoded) return null;

  try {
    const decoded =
      typeof atob === "function"
        ? atob(encoded)
        : Buffer.from(encoded, "base64").toString("utf-8");
    const frontendApi = decoded.replace(/\$$/, "");
    if (!frontendApi) return null;

    const accountsHost = frontendApi.startsWith("clerk.")
      ? frontendApi.replace(/^clerk\./, "accounts.")
      : `accounts.${frontendApi}`;

    return `https://${accountsHost}/user`;
  } catch {
    return null;
  }
}
