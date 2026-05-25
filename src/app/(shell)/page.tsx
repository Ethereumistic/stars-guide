import { Hero } from "@/components/hero/hero";
import { GalacticGlow } from "@/components/hero/galactic-glow";
import { websiteSchema, organizationSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import dynamic from "next/dynamic";

// Below-fold landing sections — lazy loaded to reduce initial JS bundle & INP
// Each wrapper has min-height to prevent CLS while the component loads
const CosmicToday = dynamic(
  () =>
    import("@/components/landing/cosmic-today").then((mod) => ({
      default: mod.CosmicToday,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] w-full animate-pulse rounded-xl bg-muted/10" />
    ),
  },
);

const LiveSkyRadar = dynamic(
  () =>
    import("@/components/landing/live-sky-radar").then((mod) => ({
      default: mod.LiveSkyRadar,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[500px] w-full animate-pulse rounded-xl bg-muted/10" />
    ),
  },
);

const FeatureShowcase = dynamic(
  () =>
    import("@/components/landing/feature-showcase").then((mod) => ({
      default: mod.FeatureShowcase,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[600px] w-full animate-pulse rounded-xl bg-muted/10" />
    ),
  },
);

const FeatureShowcase2 = dynamic(
  () =>
    import("@/components/landing/feature-showcase2").then((mod) => ({
      default: mod.FeatureShowcase2,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[600px] w-full animate-pulse rounded-xl bg-muted/10" />
    ),
  },
);

const SocialProof = dynamic(
  () =>
    import("@/components/landing/social-proof").then((mod) => ({
      default: mod.SocialProof,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[300px] w-full animate-pulse rounded-xl bg-muted/10" />
    ),
  },
);

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