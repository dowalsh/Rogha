// Extreme-content filter — Guideline 1.2 §2
//
// Blocks two categories only:
//   1. Racial/ethnic slurs (no legitimate journalistic context excuses these)
//   2. CSAM-specific terminology (non-negotiable legal requirement)
//
// Ordinary profanity, sexual language, and clinical/journalistic terms
// (e.g. "pedophile", "rape", "slur") are deliberately NOT blocked.
//
// Add terms here as needed. Keep the list minimal and intentional.

const BLOCKED_TERMS: string[] = [
  // ── Racial / ethnic slurs ──────────────────────────────────────────────────
  // Add slurs here. Use the base form; the filter also catches common
  // leet-speak and spacing evasions (n1gger, n i g g e r, etc.).
  "nigger",
  "nigga",
  "kike",
  "spic",
  "wetback",
  "chink",
  "gook",
  "raghead",
  "towelhead",
  "beaner",
  "darkie",
  "jigaboo",
  "jiggaboo",
  "coon", // whole-word only — "raccoon", "cocoon" won't match
  "paki",
  "slanteye",
  "nambla",
];

// ── Normalization ─────────────────────────────────────────────────────────────
// Applied before matching to catch common evasions. Does NOT alter the original
// text — only used for the check.

function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      // Collapse letter-by-letter spacing: "n i g g e r" → "nigger"
      .replace(/(\b\w)(\s+\w){2,}/g, (m) => m.replace(/\s+/g, ""))
      // Common leet-speak substitutions
      .replace(/4/g, "a")
      .replace(/3/g, "e")
      .replace(/1/g, "i")
      .replace(/0/g, "o")
      .replace(/5/g, "s")
      .replace(/7/g, "t")
      // Remove dots/dashes/underscores used between letters (n.i.g.g.e.r)
      .replace(/(\w)[.\-_](?=\w)/g, "$1")
  );
}

// ── Whole-word regex builder ───────────────────────────────────────────────────
// Using \b ensures "cocoon" doesn't match "coon".

const PATTERNS: RegExp[] = BLOCKED_TERMS.map(
  (term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
);

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the text contains a blocked term. */
export function containsBlockedContent(text: string): boolean {
  const normalized = normalize(text);
  return PATTERNS.some((re) => re.test(normalized));
}

/** Extract plain text from a TipTap/ProseMirror JSON doc for filtering. */
export function extractTextFromDoc(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const node = doc as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromDoc).join(" ");
  }
  return "";
}

/** Checks all supplied strings and returns true if any is blocked. */
export function isContentBlocked(
  ...texts: (string | null | undefined)[]
): boolean {
  return texts.some((t) => t != null && containsBlockedContent(t));
}
