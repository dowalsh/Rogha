# Post links & "In thread" (brainstorm)

Status: **half-baked brainstorm, not committed to build.** Captured from a design session so the thinking isn't lost. Promote to a real spec (or kill it) when its time comes.

## The itch

Two moments, same underlying need - "this post builds on that one":

1. **Continuing yourself.** I wrote a post about making a chicken roll; now I'm writing a second and want to tie the two together.
2. **Responding to a friend.** A longer, more thoughtful engagement with someone else's post than a comment allows - a letter back, landing in your own space on Sunday.

Why it fits Rogha: a friend writing a whole post because of yours is about the deepest form of "actually read and responded to" the product can produce. Earned engagement, not extracted.

## Shape: two constituent features

Rather than an explicit "reply" relationship, split it into two small pieces. Ship 1 first; 2 builds on it.

### Feature 1 - Post links in the composer
- While writing, type `/` (or similar) to pick from published posts you can see; inserts an inline link chip with the post's title, wherever you put it in your sentence.
- "Following on from [Chicken Roll]..." replaces any dedicated "in reply to" header - the author frames it in their own words.
- On its own, this scratches the chicken-roll itch.

### Feature 2 - "In thread" backlinks
- Any post that links to this one appears automatically in an **"In thread"** block at the bottom of the post, above "keep reading".
- No setup and no explicit "reply" step: linking to someone's post *is* responding to it.
- Delivers the conversation feel for the respond-to-a-friend moment.

## Rules (tentative)
- **Visibility is the whole game.** A link or backlink only appears if the reader can see the post on the other end. Otherwise it's absent from the "In thread" block entirely.
- Only **published** posts can be linked (no drafts / submitted-but-unrevealed).
- A post can link to **any number** of posts; each shows it as a backlink.
- Only direct neighbours are shown - no full chain / thread view.
- If a linked post is deleted, the link quietly degrades and the backlink disappears.
- The original post is never edited - the backlink lives in the end-of-post area, not on the author's content.

## Decided along the way
- Name: **"In thread"** for the bottom block (considered: Written back, Replies, Connected posts, Echoes, Continued, etc.).
- **No notification in v1.** The original author is usually in the responder's audience and finds out via their Sunday edition, the slow Rogha way. Revisit if responses are getting missed.

## Open questions
- **Inline link a reader can't see:** it sits mid-sentence, so it can't just vanish. Leaning toward rendering the author's words as plain text (no chip, no title). Alternative: a title-less chip like "a post by Dylan" (leaks existence only).
- Trigger affordance: `/`, `@`, or a button in the composer toolbar.
- Should the original author be able to hide a backlink from their post (e.g. a response they don't want associated)?

## Later, not now
- Notification to the original author when a response publishes.
- A "Start a thread" action on the reader page that opens the composer pre-linked.
- Full thread/chain view.
