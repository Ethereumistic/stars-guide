"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { compositionalPlanets } from "@/astrology/planets";
import { planetUIConfig } from "@/config/planet-ui";

const PLANET_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

function getRandomPlanetId(): string {
  return PLANET_IDS[Math.floor(Math.random() * PLANET_IDS.length)];
}

const fallbackColors: Record<string, string> = {
  sun: "#D4AF37",
  moon: "#C0C0C0",
  mercury: "#A0A0A0",
  venus: "#CD7F32",
  mars: "#B22222",
  jupiter: "#DAA520",
  saturn: "#C0B283",
  uranus: "#5F9EA0",
  neptune: "#4682B4",
  pluto: "#8B7355",
};

export function PlanetShowcase() {
  const planetId = useMemo(() => getRandomPlanetId(), []);
  const planetData = useMemo(
    () => compositionalPlanets.find((p) => p.id === planetId),
    [planetId],
  );
  const ui = planetUIConfig[planetId];

  if (!planetData || !ui) return null;

  const [themeColor, setThemeColor] = useState(
    fallbackColors[planetId] || "#D4AF37",
  );

  useEffect(() => {
    if (ui?.themeColor?.startsWith("var(")) {
      const varName = ui.themeColor.slice(4, -1);
      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      if (resolved) setThemeColor(resolved);
    } else if (ui?.themeColor) {
      setThemeColor(ui.themeColor);
    }
  }, [ui?.themeColor]);

  const imageScale = ui.imageScale ?? 1;

  return (
    <div className="relative h-full flex flex-col items-center justify-start pt-6 lg:pt-8 px-6 lg:px-8 pb-6 lg:pb-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center space-y-2 mb-4"
      >
        <div className="flex items-center justify-center gap-2.5">
          <span className="text-4xl font-serif leading-none">
            {ui.rulerSymbol}
          </span>
          <h2 className="font-serif text-4xl tracking-tight text-foreground">
            {planetData.name}
          </h2>
        </div>
      </motion.div>

      {/* Planet Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{
          opacity: { duration: 0.7, delay: 0.1 },
          scale: { duration: 0.7, delay: 0.1 },
          y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
        }}
        className="relative z-10 w-full max-w-[420px] aspect-square flex items-center justify-center mb-3"
      >
        {ui.imageUrl && (
          <img
            src={ui.imageUrl}
            alt={planetData.name}
            className="relative w-full h-full object-contain"
            style={{
              transform: `scale(${imageScale})`,
              filter: `drop-shadow(0 0 20px ${themeColor}10)`,
            }}
          />
        )}
      </motion.div>

      {/* Domain */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="relative z-10 font-serif italic text-3xl text-white text-center mb-5"
      >
        {planetData.domain}
      </motion.p>

      {/* Bottom divider line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10 mt-auto flex items-center gap-2 w-full"
      >
        <div className="h-px flex-1 bg-white/[0.04]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/15">
          {planetData.compositionalVerbPhrase}
        </span>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </motion.div>
    </div>
  );
}
