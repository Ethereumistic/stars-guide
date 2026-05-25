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
import dynamic from "next/dynamic";

// Heavy animation components — lazy loaded (no SSR) to reduce initial JS & INP
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DeferredShootingStars = dynamic(
  () =>
    import("@/components/hero/stars-canvas").then((mod) => mod.ShootingStars),
  { ssr: false },
) as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DeferredStarsBackground = dynamic(
  () =>
    import("@/components/hero/stars-canvas").then((mod) => mod.StarsBackground),
  { ssr: false },
) as any;
import { PlausibleAnalytics } from "@/components/analytics/plausible";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-serif",
  subsets: ["latin"],
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
        url: "/og-image.png",
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
                  <div className="relative min-h-screen">
                    {/* Ambient star background — deferred (no SSR) to reduce initial JS & main-thread work */}
                    <div className="fixed inset-0 z-0 pointer-events-none">
                      <DeferredShootingStars
                        minSpeed={15}
                        maxSpeed={35}
                        minDelay={800}
                        maxDelay={3000}
                        starColor="#d4af37"
                        trailColor="#8b7355"
                      />
                      <DeferredStarsBackground
                        starDensity={0.0002}
                        allStarsTwinkle={true}
                        twinkleProbability={0.8}
                        minTwinkleSpeed={0.3}
                        maxTwinkleSpeed={1.2}
                      />
                    </div>
                    {children}
                  </div>
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
