// src/lib/circleNames.ts
// Suggested-name randomizer for the "create your first circle" step of
// first-run onboarding — docs/specs/2026-09-19-first-run-onboarding.md wants
// a default name plus a randomizer so a cold first-mover never has to stare
// at a blank field.

const ADJECTIVES = [
  "Sunday",
  "Inner",
  "Close",
  "Weekly",
  "Quiet",
  "Regular",
  "Trusted",
  "Favorite",
];

const NOUNS = [
  "Circle",
  "Crew",
  "Regulars",
  "Friends",
  "Bunch",
  "People",
  "Gang",
  "Company",
];

export function suggestCircleName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
