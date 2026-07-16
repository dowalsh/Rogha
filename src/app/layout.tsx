import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { upsertClerkUser } from "@/actions/user.action";
import { currentUser } from "@clerk/nextjs/server";
import DeepLinkInit from "@/components/DeepLinkInit";
import PushNotificationInit from "@/components/PushNotificationInit";
import SplashScreenInit from "@/components/SplashScreenInit";
import TermsGate from "@/components/TermsGate";
import { formatDistanceToNow } from "date-fns";
import { SWRProvider } from "@/components/providers/SWRProvider";

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
  maximumScale: 1,
  userScalable: false,
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

  const user = await currentUser().catch((err) => {
    console.error("[layout] currentUser() failed:", err);
    return null;
  });
  if (user) {
    await upsertClerkUser(user);
  }

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SWRProvider>
          <TooltipProvider delayDuration={150}>
            <ThemeProvider
              attribute="class"
              forcedTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <div className="min-h-screen">
                {process.env.NODE_ENV === "development" && (
                  <div
                    className="w-full bg-red-600 text-white text-center pb-2 text-sm font-bold z-50"
                    style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
                  >
                    DEV
                  </div>
                )}
                {process.env.VERCEL_ENV === "preview" && (
                  <div
                    className="w-full bg-green-400 text-black text-center pb-2 text-sm font-bold z-50"
                    style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
                  >
                    PREVIEW
                    {process.env.NEXT_PUBLIC_BUILD_TIME && (
                      <span className="font-normal">
                        {" "}
                        · deployed{" "}
                        {new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString(
                          "en-US",
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "UTC",
                          },
                        )}{" "}
                        UTC (
                        {formatDistanceToNow(
                          new Date(process.env.NEXT_PUBLIC_BUILD_TIME),
                          { addSuffix: true },
                        )}
                        )
                      </span>
                    )}
                  </div>
                )}
                {process.env.NEXT_PUBLIC_SHOW_UPDATE_NOTICE === "true" && (
                  <div
                    className="w-full bg-yellow-400 text-black text-center pb-2 text-sm font-medium z-50 px-4"
                    style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
                  >
                    Having issues? Open TestFlight → tap Update → delete &amp;
                    reinstall Rogha if sign-in still fails.
                  </div>
                )}
                <Navbar />
                <main className="pb-8">
                  <div className="max-w-7xl mx-auto px-4">
                    <TermsGate>{children}</TermsGate>
                  </div>
                </main>
              </div>
              <Toaster />
              <DeepLinkInit />
              <PushNotificationInit />
              <SplashScreenInit />
            </ThemeProvider>
            {/* Eruda in-page console — set to true to enable for mobile debugging */}
            {false && <Script id="eruda-init" strategy="afterInteractive">{`
              var s = document.createElement('script');
              s.src = '//cdn.jsdelivr.net/npm/eruda';
              s.onload = function() { eruda.init(); };
              document.head.appendChild(s);
            `}</Script>}
          </TooltipProvider>
          </SWRProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
