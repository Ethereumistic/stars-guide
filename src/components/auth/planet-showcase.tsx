"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { compositionalPlanets } from "@/astrology/planets";
import { planetUIConfig } from "@/config/planet-ui";
import {
  Crown,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Ruler,
  Moon,
} from "lucide-react";

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

const elementIcons: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-4 h-4" />,
  Water: <Droplets className="w-4 h-4" />,
  Air: <Wind className="w-4 h-4" />,
  Earth: <Mountain className="w-4 h-4" />,
};

interface Spec {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function buildSpecs(planetData: (typeof compositionalPlanets)[number]): Spec[] {
  const specs: Spec[] = [];

  if (planetData.astrology?.archetype) {
    specs.push({
      label: "Archetype",
      value: planetData.astrology.archetype,
      icon: <Crown className="w-4 h-4" />,
    });
  }

  if (planetData.astrology?.element) {
    const element = planetData.astrology.element.split(",")[0].trim();
    specs.push({
      label: "Element",
      value: element,
      icon: elementIcons[element] || null,
    });
  }

  if (planetData.astronomy?.diameter) {
    const short = planetData.astronomy.diameter.split("(")[0].trim();
    specs.push({
      label: "Diameter",
      value: short,
      icon: <Ruler className="w-4 h-4" />,
    });
  }

  if (planetData.astronomy?.moons) {
    const short = planetData.astronomy.moons.split("(")[0].trim();
    specs.push({
      label: "Moons",
      value: short,
      icon: <Moon className="w-4 h-4" />,
    });
  }

  return specs;
}

function SpecGrid({
  planetData,
}: {
  planetData: (typeof compositionalPlanets)[number];
}) {
  const specs = buildSpecs(planetData);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="relative z-10 w-full"
    >
      <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
        {specs.map((spec, i) => (
          <div
            key={i}
            className="p-3 flex flex-row items-center justify-between group hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex flex-col space-y-1 min-w-0">
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-40">
                {spec.label}
              </span>
              <p className="text-sm font-serif text-white tracking-tight truncate">
                {spec.value}
              </p>
            </div>
            <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-2 shrink-0">
              {spec.icon}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

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

      {/* Spec Grid */}
      {planetData.astronomy && planetData.astrology && (
        <SpecGrid planetData={planetData} />
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
