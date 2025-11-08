import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { upsertClerkUser } from "@/actions/user.action";
import { currentUser } from "@clerk/nextjs/server";

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

export const metadata: Metadata = {
  title: "Rogha",
  description: "Dylan's Playground",
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
                <Navbar />
                <main className="py-8">
                  <div className="max-w-7xl mx-auto px-4">{children}</div>
                </main>
              </div>
              <Toaster />
            </ThemeProvider>
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
