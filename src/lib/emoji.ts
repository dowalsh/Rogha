const EMOJI_PATTERN = new RegExp(
  "^[\\p{Extended_Pictographic}\\u{1F3FB}-\\u{1F3FF}\\u{FE0F}\\u{200D}]+$",
  "u"
);

export const SIGNOFF_EMOJI_MAX_LENGTH = 8;

/**
 * Accepts short emoji sequences (including ZWJ/skin-tone/variation-selector
 * combos like 👩‍🚀 or 👍🏽) while rejecting plain text, since this value gets
 * embedded directly into email subjects/HTML and push payloads.
 */
export function isValidSignoffEmoji(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > SIGNOFF_EMOJI_MAX_LENGTH) return false;
  return EMOJI_PATTERN.test(trimmed);
}
