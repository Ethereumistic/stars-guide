"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalPlanets } from "@/astrology/planets";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

/* ── Types ─────────────────────────────────────────────────── */

interface RetrogradeWindow {
  planetId: string;
  planetName: string;
  startDate: Date;
  endDate: Date;
  signId: string | undefined;
  isActive: boolean;
  daysLeft: number | null;
}

/* ── Constants ──────────────────────────────────────────────── */

const RETROGRADE_PLANETS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

/* ── Find the next retrograde window for a planet ─────────── */

function findNextRetrogradeWindow(
  planetId: string,
  fromDate: Date,
): RetrogradeWindow | null {
  const planet = compositionalPlanets.find((p) => p.id === planetId);
  if (!planet) return null;

  const maxScanDays = 730; // 2 years safety
  let d = new Date(fromDate);

  // Step 1: find if currently retrograde, and if so find the end
  const todayTelemetry = getPlanetTelemetry(planetId, d);
  let currentlyRetro = todayTelemetry?.retrograde ?? false;

  if (currentlyRetro) {
    // Find the end date of current retrograde
    let scanEnd = new Date(d);
    for (let i = 0; i < maxScanDays; i++) {
      scanEnd.setDate(scanEnd.getDate() + 1);
      const t = getPlanetTelemetry(planetId, scanEnd);
      if (!t?.retrograde) {
        // This is the day it goes direct
        return {
          planetId,
          planetName: planet.name,
          startDate: new Date(d),
          endDate: new Date(scanEnd),
          signId: todayTelemetry?.signId,
          isActive: true,
          daysLeft: differenceInDays(scanEnd, new Date()),
        };
      }
    }
    return null;
  }

  // Step 2: find the next retrograde start
  let scanStart = new Date(d);
  for (let i = 0; i < maxScanDays; i++) {
    scanStart.setDate(scanStart.getDate() + 1);
    const t = getPlanetTelemetry(planetId, scanStart);
    if (t?.retrograde) {
      // Found start. Now find the end.
      const startDate = new Date(scanStart);
      let scanEnd = new Date(startDate);
      for (let j = 0; j < maxScanDays; j++) {
        scanEnd.setDate(scanEnd.getDate() + 1);
        const endT = getPlanetTelemetry(planetId, scanEnd);
        if (!endT?.retrograde) {
          return {
            planetId,
            planetName: planet.name,
            startDate,
            endDate: new Date(scanEnd),
            signId: t?.signId,
            isActive: false,
            daysLeft: differenceInDays(startDate, new Date()),
          };
        }
      }
      break;
    }
  }

  return null;
}

/* ── Find ALL upcoming retrogrades across all planets ───── */

function findAllUpcomingRetrogrades(fromDate: Date): RetrogradeWindow[] {
  const windows: RetrogradeWindow[] = [];

  for (const planetId of RETROGRADE_PLANETS) {
    const window = findNextRetrogradeWindow(planetId, fromDate);
    if (window) {
      windows.push(window);
    }
  }

  // Sort by start date
  return windows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/* ── Find currently active retrogrades ───────────────────── */

function findCurrentRetrogrades(): RetrogradeWindow[] {
  const now = new Date();
  const active: RetrogradeWindow[] = [];

  for (const planetId of RETROGRADE_PLANETS) {
    const planet = compositionalPlanets.find((p) => p.id === planetId);
    if (!planet) continue;

    const t = getPlanetTelemetry(planetId, now);
    if (t?.retrograde) {
      // Find the end date
      let d = new Date(now);
      let endDate: Date | null = null;
      for (let i = 0; i < 365; i++) {
        d.setDate(d.getDate() + 1);
        const nextT = getPlanetTelemetry(planetId, d);
        if (!nextT?.retrograde) {
          endDate = new Date(d);
          break;
        }
      }

      active.push({
        planetId,
        planetName: planet.name,
        startDate: now,
        endDate: endDate ?? now,
        signId: t.signId,
        isActive: true,
        daysLeft: endDate ? differenceInDays(endDate, now) : null,
      });
    }
  }

  return active.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

/* ── Retrograde Card ─────────────────────────────────────── */

function RetrogradeCard({
  window,
  featured = false,
}: {
  window: RetrogradeWindow;
  featured?: boolean;
}) {
  const ui = planetUIConfig[window.planetId];
  const themeColor = ui?.themeColor ?? "#38bdf8";
  const symbol = ui?.rulerSymbol ?? "○";
  const imageScale = ui?.imageScale ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col items-center",
        featured ? "justify-center h-full" : "",
      )}
    >
      {/* Planet image */}
      {ui?.imageUrl && (
        <div className="relative flex items-center justify-center">
          {/* Glow */}
          <div
            className="absolute w-48 h-48 md:w-64 md:h-64 lg:w-90 lg:h-90 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: themeColor }}
          />
          <motion.img
            src={ui.imageUrl}
            alt={window.planetName}
            className={cn(
              "relative object-contain drop-shadow-2xl",
              featured
                ? "w-48 h-48 md:w-64 md:h-64 lg:w-90 lg:h-90"
                : "w-24 h-24 md:w-32 md:h-32",
            )}
            style={{
              transform: `scale(${featured ? imageScale * 1.2 : imageScale})`,
              filter: "brightness(1.1)",
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      )}

      {/* Planet info */}
      <div className={cn("text-center space-y-3", featured ? "mt-8" : "mt-4")}>
        {/* Symbol + Name */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl md:text-3xl" style={{ color: themeColor }}>
            {symbol}
          </span>
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-serif tracking-tight">
            {window.planetName}
          </h3>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-center gap-2">
          {window.isActive ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive uppercase tracking-widest font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
              </span>
              Retrograde Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest font-medium">
              Next Retrograde
            </span>
          )}
        </div>

        {/* Date range */}
        <div className="space-y-1 flex gap-4">
          <p className="text-sm md:text-base text-white/90 font-mono tracking-wide">
            {format(window.startDate, "MMMM d, yyyy")} →{" "}
            {format(window.endDate, "MMMM d, yyyy")}
          </p>
          {window.daysLeft !== null && (
            <p
              className={cn(
                "text-sm md:text-base font-medium",
                window.isActive ? "text-destructive" : "text-primary ",
              )}
            >
              {window.isActive
                ? `${window.daysLeft} days until direct`
                : `in ${window.daysLeft} days`}
            </p>
          )}
        </div>

        {/* Interval bar for featured */}
        {featured && (
          <div className="w-full max-w-sm mx-auto pt-2">
            <div className="flex items-center justify-between text-[9px] text-white/30 uppercase tracking-wider mb-1.5">
              <span>{format(window.startDate, "MMM d")}</span>
              <span>{format(window.endDate, "MMM d")}</span>
            </div>
            <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
              {window.isActive && window.daysLeft !== null && (
                <>
                  {/* Calculate elapsed portion if we can */}
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${themeColor}30, ${themeColor}70)`,
                      width: "60%", // approximate visual
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                  />
                </>
              )}
              {!window.isActive && (
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${themeColor}20, ${themeColor}50)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: "15%" }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Upcoming Square Cards ───────────────────────────────── */

function UpcomingSquareCards({ windows }: { windows: RetrogradeWindow[] }) {
  const display = windows.slice(0, 3);
  if (display.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold">
        Upcoming
      </p>
      <div className="grid grid-cols-3 gap-2">
        {display.map((w, i) => {
          const ui = planetUIConfig[w.planetId];
          const themeColor = ui?.themeColor ?? "#38bdf8";
          return (
            <motion.div
              key={w.planetId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="flex flex-col items-center justify-center aspect-square rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center hover:border-white/10 hover:bg-white/[0.03] transition-colors"
            >
              {/* Planet title */}
              <p className="text-[10px] font-serif uppercase tracking-wider text-white/80 leading-tight">
                {w.planetName}
              </p>

              {/* Small planet image */}
              {ui?.imageUrl && (
                <div className="relative flex items-center justify-center my-1.5">
                  <div
                    className="absolute w-10 h-10 rounded-full blur-xl opacity-30"
                    style={{ backgroundColor: themeColor }}
                  />
                  <img
                    src={ui.imageUrl}
                    alt={w.planetName}
                    className="relative w-8 h-8 object-contain"
                    style={{
                      transform: `scale(${ui.imageScale ?? 1})`,
                      filter: "brightness(1.15)",
                    }}
                  />
                </div>
              )}

              {/* Date interval */}
              <p className="text-[9px] font-mono text-white/40 tracking-wide leading-tight">
                {format(w.startDate, "MMM d")}
                <span className="text-white/20 mx-0.5">→</span>
                {format(w.endDate, "MMM d")}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Slide ───────────────────────────────────────────── */

interface AstronomicalEngineSlideProps {
  isActive?: boolean;
  wasActive?: boolean;
}

export function AstronomicalEngineSlide({
  isActive,
}: AstronomicalEngineSlideProps) {
  const [featured, setFeatured] = React.useState<RetrogradeWindow | null>(null);
  const [upcoming, setUpcoming] = React.useState<RetrogradeWindow[]>([]);
  const [current, setCurrent] = React.useState<RetrogradeWindow[]>([]);

  React.useEffect(() => {
    const now = new Date();
    const all = findAllUpcomingRetrogrades(now);
    const active = findCurrentRetrogrades();

    // Featured = first active, or first upcoming
    const feat = active[0] ?? all[0] ?? null;
    setFeatured(feat);

    // Upcoming = rest (excluding featured)
    const rest = all.filter((w) => !feat || w.planetId !== feat.planetId);
    setUpcoming(rest);
    setCurrent(active);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 h-full items-center px-6 md:px-12 max-w-[1600px] mx-auto py-8 lg:py-0">
      {/* ── Left Column: Title (1 col span) ── */}
      <motion.div
        className="space-y-6 col-span-1"
        initial={{ opacity: 0, x: -40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-4">
          <Badge className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-primary/5 border-primary/10 text-primary">
            Live Sky
          </Badge>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight text-nowrap leading-[1.1]">
            Astronomical Engine
          </h2>
          <p className="text-muted-foreground text-sm md:text-base uppercase tracking-widest font-medium max-w-md">
            Real-time planetary positions and sky events
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Our engine computes live celestial mechanics using the
          astronomy-engine library. Track retrogrades as they happen and know
          exactly when the next shift begins.
        </p>

        {/* Currently active retrogrades */}
        <AnimatePresence>
          {current.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2 pt-2"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-rose-400/60 font-bold">
                Retrograde Now
              </p>
              <div className="flex flex-wrap gap-2">
                {current.map((e) => (
                  <span
                    key={e.planetId}
                    className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/15 text-rose-300"
                  >
                    <span
                      style={{ color: planetUIConfig[e.planetId]?.themeColor }}
                    >
                      {planetUIConfig[e.planetId]?.rulerSymbol}
                    </span>
                    {e.planetName}
                    <span className="opacity-50">℞</span>
                    {e.daysLeft !== null && (
                      <span className="text-white/40">{e.daysLeft}d</span>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming square cards below current */}
        <UpcomingSquareCards windows={upcoming} />
      </motion.div>

      {/* ── Right Column: Featured Planet (2 col span) ── */}
      <motion.div
        className="col-span-2 flex items-center justify-center h-full"
        initial={{ opacity: 0, x: 40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        {featured && <RetrogradeCard window={featured} featured />}
      </motion.div>
    </div>
  );
}
