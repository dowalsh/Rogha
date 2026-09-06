// Reserves trailing scroll room while a comment composer is open, instead
// of a permanent empty gap at the bottom of every page. Without it, a
// composer opened near the end of a short thread has nowhere left to
// scroll: the native keyboard-avoidance scroll (KeyboardResize.Native in
// capacitor.config.ts) can only move the page up to the end of its actual
// content, so on a short page the keyboard still covers the field no
// matter what.
//
// Controlled, not self-detecting: `active` must flip to true in the same
// render pass that opens the composer (see CommentsSection's
// onComposerOpenChange, called synchronously alongside setActiveComposer —
// not from a useEffect). That ordering matters because the native scroll
// only gets one shot at this, computed off whatever's already
// committed/painted by the time InlineComposer's mount effect calls
// focus() — a buffer that only appears after focus() (e.g. via a
// focusin listener) is already too late to be accounted for.
export function KeyboardSpaceBuffer({ active }: { active: boolean }) {
  if (!active) return null;
  return <div aria-hidden className="h-80" />;
}
