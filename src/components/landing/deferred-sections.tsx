"use client";

import dynamic from "next/dynamic";

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

export { CosmicToday, LiveSkyRadar, FeatureShowcase, FeatureShowcase2, SocialProof };
