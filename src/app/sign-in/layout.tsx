import type { Metadata } from "next";

// The in-app browser (SFSafariViewController) that opens this page for
// native-app sign-in has no Capacitor bridge, so it's indistinguishable from
// regular mobile Safari to client-side checks. Suppress the Smart App Banner
// here so it can't appear on top of a login flow the user is already in.
export const metadata: Metadata = {
  itunes: undefined,
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
