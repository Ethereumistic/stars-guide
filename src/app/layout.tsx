import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { buildOgImageUrl } from "@/lib/seo/og";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { UserSync } from "@/components/providers/user-sync";
import { ReferralTracker } from "@/components/providers/referral-tracker";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { GoogleOneTapProvider } from "@/components/providers/google-one-tap-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlausibleAnalytics } from "@/components/analytics/plausible";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "optional", // CWV: avoid FOIT→FOUT layout shifts
});

const cinzel = Cinzel({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "optional", // CWV: avoid FOIT→FOUT layout shifts
});

export const metadata: Metadata = {
  title: {
    default: "stars.guide | Navigate your fate",
    template: "%s | stars.guide",
  },
  description: "Celestial horoscopes, birth chart analysis, and astrology guides. Discover your destiny with AI-powered cosmic insights.",
  metadataBase: new URL("https://stars.guide"),
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://stars.guide",
    siteName: "stars.guide",
    images: [
      {
        url: buildOgImageUrl({ title: "stars.guide", subtitle: "Navigate your fate" }),
        width: 1200,
        height: 630,
        alt: "stars.guide - Navigate your fate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@starsguide",
    creator: "@starsguide",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <PlausibleAnalytics />
        </head>
        <body
          className={`${inter.variable} ${cinzel.variable} antialiased font-sans selection:bg-primary/20`}
        >
          <ConvexClientProvider>
            <UserSync />
            <ReferralTracker />
            <AnalyticsProvider>
            <GoogleOneTapProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider>
                  {children}
                </TooltipProvider>
              </ThemeProvider>
            </GoogleOneTapProvider>
            </AnalyticsProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
