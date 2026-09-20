import { Space_Mono } from "next/font/google";

// A more "secret codey" monospace for invite-code display/entry — used
// instead of the default font-mono (system monospace) anywhere a circle
// invite code is shown or typed, so it reads as a code, not just text.
export const secretCodeFont = Space_Mono({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
