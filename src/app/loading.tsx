// Neutral fallback only — nav chrome lives outside this route segment in
// the root layout, so this just needs to hold the content area's height
// steady. Routes should own a real skeleton (see docs/loading-ui.md)
// rather than relying on this ever being the user-visible loading state.
export default function Loading() {
  return <div className="min-h-[60vh]" />;
}
