import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { upsertClerkUser } from "@/actions/user.action";
import { currentUser } from "@clerk/nextjs/server";
import DeepLinkInit from "@/components/DeepLinkInit";
import PushNotificationInit from "@/components/PushNotificationInit";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Rogha",
  description: "Social media by friends, for friends.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // // 👇 Only run this lazy sync in development

  const user = await currentUser();
  if (user) {
    // pass the Clerk user directly
    await upsertClerkUser(user);
  }

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <TooltipProvider delayDuration={150}>
            <ThemeProvider
              attribute="class"
              forcedTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <div className="min-h-screen">
                {process.env.NODE_ENV === "development" && (
                  <div className="w-full bg-red-600 text-white text-center py-2 text-sm font-bold z-50">
                    DEV
                  </div>
                )}
                {process.env.VERCEL_ENV === "preview" && (
                  <div className="w-full bg-green-400 text-black text-center py-2 text-sm font-bold z-50">
                    PREVIEW
                  </div>
                )}
                <Navbar />
                <main className="py-8">
                  <div className="max-w-7xl mx-auto px-4">{children}</div>
                </main>
              </div>
              <Toaster />
              <DeepLinkInit />
              <PushNotificationInit />
            </ThemeProvider>
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
