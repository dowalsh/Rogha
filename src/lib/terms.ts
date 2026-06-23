export const TERMS_VERSION = 2;

export function hasAcceptedTerms(unsafeMetadata: Record<string, unknown>): boolean {
  const acceptance = unsafeMetadata?.termsAccepted as { version?: number } | undefined;
  return acceptance?.version === TERMS_VERSION;
}
