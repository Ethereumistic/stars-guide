"use client";

import dynamic from "next/dynamic";

const DeferredShootingStars = dynamic(
  () =>
    import("@/components/hero/stars-canvas").then((mod) => mod.ShootingStars),
  { ssr: false },
);

const DeferredStarsBackground = dynamic(
  () =>
    import("@/components/hero/stars-canvas").then((mod) => mod.StarsBackground),
  { ssr: false },
);

export function DeferredStarField() {
  return (
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
  );
}
