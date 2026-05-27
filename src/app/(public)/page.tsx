import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";
import { Hero } from "@/components/hero/hero";
import { GalacticGlow } from "@/components/hero/galactic-glow";
import { websiteSchema, organizationSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import {
  CosmicToday,
  LiveSkyRadar,
  FeatureShowcase,
  FeatureShowcase2,
  SocialProof,
} from "@/components/landing/deferred-sections";

export const metadata: Metadata = buildMetadata({
  title: "Navigate your fate",
  description:
    "Celestial horoscopes, birth chart analysis, and astrology guides. Discover your destiny with AI-powered cosmic insights on stars.guide.",
  path: "/",
  ogImage: buildOgImageUrl({
    title: "stars.guide",
    subtitle: "Navigate your fate",
  }),
});

export default function Home() {
  return (
    <main className="relative z-10 flex flex-col overflow-x-clip">
      <JsonLd data={websiteSchema() as unknown as Record<string, unknown>} />
      <JsonLd data={organizationSchema() as unknown as Record<string, unknown>} />
      {/* Above-the-fold — always eager loaded */}
      <div className="relative">
        <GalacticGlow />
        <Hero />
      </div>

      {/* Below-fold sections — content-visibility: auto + dynamic import for faster LCP/INP */}
      <div className="cwv-below-fold max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
        <CosmicToday
        // debugRetrogradePlanet="mercury"
        />
        <LiveSkyRadar />
      </div>

      <div className="cwv-below-fold max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
        <FeatureShowcase />
      </div>

      <div className="cwv-below-fold">
        <FeatureShowcase2 />
      </div>

      <div className="cwv-below-fold max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
        <SocialProof />
      </div>
    </main>
  );
}