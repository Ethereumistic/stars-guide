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

function getDailyPlanetId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return PLANET_IDS[dayOfYear % PLANET_IDS.length];
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
  const planetId = useMemo(() => getDailyPlanetId(), []);
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
      {/* Title — same style as form title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center space-y-2 mb-4"
      >
        <p className="font-sans italic text-muted-foreground">
          Celestial Focus
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <span
            className="text-3xl font-serif leading-none"
            // style={{ color: themeColor }}
          >
            {ui.rulerSymbol}
          </span>
          <h2 className="font-serif text-3xl tracking-tight text-foreground">
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
        className="relative z-10 w-full max-w-[330px] aspect-square flex items-center justify-center mb-3"
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
        className="relative z-10 font-serif italic text-sm text-muted-foreground text-center mb-5"
      >
        {planetData.domain}
      </motion.p>

      {/* Psychological Function Quote */}
      {planetData.psychologicalFunction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative z-10 w-full rounded-md border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{
              background: `linear-gradient(to right, transparent, ${themeColor}25, transparent)`,
            }}
          />
          <p className="font-serif text-[13px] text-white/55 leading-relaxed italic text-center">
            &ldquo;{planetData.psychologicalFunction}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Bottom divider line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10 mt-5 flex items-center gap-2 w-full"
      >
        <div className="h-px flex-1 bg-white/[0.04]" />
        <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/15">
          {planetData.compositionalVerbPhrase}
        </span>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </motion.div>
    </div>
  );
}
