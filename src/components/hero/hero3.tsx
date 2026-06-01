"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiMazeCornea, GiCursedStar } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { compositionalSigns } from "@/astrology/signs";
import { format, differenceInDays } from "date-fns";

/**
 * Hero3 — "Retrograde Carousel"
 *
 * Split layout: editorial text left, auto-rotating retrograde planet carousel right.
 * Cycles through current/upcoming retrograde planets showing their image, symbol,
 * dates, and progress — like the astronomical-engine-slide aesthetic but in hero form.
 */

/* ── Retrograde Logic ──────────────────────────────────────── */

interface RetrogradeWindow {
  planetId: string;
  planetName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  daysLeft: number | null;
}

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

function findNextRetrogradeWindow(
  planetId: string,
  fromDate: Date
): RetrogradeWindow | null {
  const maxScanDays = 730;
  let d = new Date(fromDate);

  const todayTelemetry = getPlanetTelemetry(planetId, d);
  let currentlyRetro = todayTelemetry?.retrograde ?? false;

  if (currentlyRetro) {
    let scanEnd = new Date(d);
    for (let i = 0; i < maxScanDays; i++) {
      scanEnd.setDate(scanEnd.getDate() + 1);
      const t = getPlanetTelemetry(planetId, scanEnd);
      if (!t?.retrograde) {
        return {
          planetId,
          planetName: planetId.charAt(0).toUpperCase() + planetId.slice(1),
          startDate: new Date(d),
          endDate: new Date(scanEnd),
          isActive: true,
          daysLeft: differenceInDays(scanEnd, new Date()),
        };
      }
    }
    return null;
  }

  let scanStart = new Date(d);
  for (let i = 0; i < maxScanDays; i++) {
    scanStart.setDate(scanStart.getDate() + 1);
    const t = getPlanetTelemetry(planetId, scanStart);
    if (t?.retrograde) {
      const startDate = new Date(scanStart);
      let scanEnd = new Date(startDate);
      for (let j = 0; j < maxScanDays; j++) {
        scanEnd.setDate(scanEnd.getDate() + 1);
        const endT = getPlanetTelemetry(planetId, scanEnd);
        if (!endT?.retrograde) {
          return {
            planetId,
            planetName: planetId.charAt(0).toUpperCase() + planetId.slice(1),
            startDate,
            endDate: new Date(scanEnd),
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

function getRetrogradeWindows(): RetrogradeWindow[] {
  const windows: RetrogradeWindow[] = [];
  for (const planetId of RETROGRADE_PLANETS) {
    const w = findNextRetrogradeWindow(planetId, new Date());
    if (w) windows.push(w);
  }
  return windows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/* ── Retrograde Slide ──────────────────────────────────────── */

function RetrogradeSlide({
  window: retroWindow,
  isActive,
}: {
  window: RetrogradeWindow;
  isActive: boolean;
}) {
  const ui = planetUIConfig[retroWindow.planetId];
  const themeColor = ui?.themeColor ?? "#f97316";
  const symbol = ui?.rulerSymbol ?? "○";
  const imageScale = ui?.imageScale ?? 1;

  // Get sign info
  const telemetry = getPlanetTelemetry(retroWindow.planetId);
  const signId = telemetry?.signId;
  const signData = signId
    ? compositionalSigns.find((s) => s.id === signId)
    : undefined;
  const signUI = signId ? zodiacUIConfig[signId] : undefined;
  const elementUi = signData ? elementUIConfig[signData.element] : undefined;

  // Compute progress
  const totalDays = differenceInDays(retroWindow.endDate, retroWindow.startDate);
  const elapsed = differenceInDays(new Date(), retroWindow.startDate);
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, (elapsed / totalDays) * 100)) : 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          backgroundColor: themeColor,
          opacity: 0.2,
        }}
      />

      {/* Planet image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex items-center justify-center mb-8"
      >
        <div className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56">
          {ui?.imageUrl ? (
            <>
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30"
                style={{ backgroundColor: themeColor }}
              />
              <img
                src={ui.imageUrl}
                alt={retroWindow.planetName}
                className="relative w-full h-full object-contain"
                style={{ transform: `scale(${imageScale})`, filter: "brightness(1.1)" }}
              />
            </>
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-6xl border border-border/30"
              style={{ color: themeColor }}
            >
              {symbol}
            </div>
          )}
        </div>
      </motion.div>

      {/* Symbol + Name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center gap-3 mb-3"
      >
        <span className="text-2xl md:text-3xl font-serif" style={{ color: themeColor }}>
          {symbol}
        </span>
        <h2 className="text-4xl lg:text-5xl font-serif tracking-wide text-foreground">
          {retroWindow.planetName}
        </h2>
      </motion.div>

      {/* Status badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-4"
      >
        {retroWindow.isActive ? (
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
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="relative p-4 md:p-5 border border-white/[0.06] bg-black/40 w-full max-w-sm"
        style={{ borderRadius: "4px" }}
      >
        {signData && elementUi && signUI && (
          <div className="flex items-center gap-4">
            {/* Element frame + sign icon */}
            <div className="shrink-0 relative flex items-center justify-center">
              <img
                src={elementUi.frameUrl}
                alt=""
                className="w-[72px] h-[72px] object-cover opacity-90"
              />
              {(() => {
                const SignIcon = signUI.icon;
                return (
                  <SignIcon
                    className="absolute w-7 h-7 drop-shadow-lg"
                    style={{ color: elementUi.styles.primary }}
                  />
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="font-mono text-[8px] uppercase tracking-[0.35em] block mb-1"
                style={{ color: elementUi.styles.primary }}
              >
                Transiting {signData.name}
              </span>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-serif text-white/65 tabular-nums">
                    {retroWindow.daysLeft !== null && retroWindow.daysLeft > 0
                      ? retroWindow.daysLeft
                      : "—"}
                  </span>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                    {retroWindow.isActive ? "days left" : "days away"}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="relative w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${themeColor}25, ${themeColor}60)`,
                    boxShadow: `0 0 8px ${themeColor}15`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-[9px] text-white/20">
                  {format(retroWindow.startDate, "MMM d")} → {format(retroWindow.endDate, "MMM d")}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Slide Indicators ──────────────────────────────────────── */

function SlideIndicators({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="relative h-1.5 rounded-full transition-all duration-500 cursor-pointer"
          style={{
            width: i === active ? 24 : 8,
            backgroundColor: i === active ? "var(--primary)" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export function Hero3() {
  const [mounted, setMounted] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [windows, setWindows] = React.useState<RetrogradeWindow[]>([]);

  React.useEffect(() => {
    setMounted(true);
    setWindows(getRetrogradeWindows());
  }, []);

  // Auto-rotate every 4s
  React.useEffect(() => {
    if (!mounted || windows.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % windows.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mounted, windows.length]);

  const handleSlideSelect = (i: number) => {
    setActiveSlide(i);
  };

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vh] opacity-[0.04]"
          style={{ background: "radial-gradient(circle at 70% 50%, var(--mars) 0%, transparent 50%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* ── Left: Text Content ─────────────────────── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-7 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-serif text-destructive"
            >
              <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
              Live Sky Data
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-2"
            >
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                <span className="block text-foreground">Navigate Your</span>
                <span className="block bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Cosmic Journey
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-xl text-base sm:text-lg text-muted-foreground font-sans leading-relaxed"
            >
              Your personal AI astrologer that remembers your story, understands
              your patterns, and guides you through life's transits with{" "}
              <span className="text-foreground font-medium italic">wisdom</span>,{" "}
              not{" "}
              <span className="text-foreground font-medium italic">fortune-telling</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <Button
                size="lg"
                asChild
                className="group relative overflow-hidden font-serif uppercase tracking-widest text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              >
                <Link href="/onboarding" className="flex items-center gap-2">
                  <GiMazeCornea className="size-5 transition-transform group-hover:rotate-180 duration-700" />
                  <span>Birth Chart</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="galactic"
                asChild
                className="group font-serif uppercase tracking-widest text-base px-8 py-6 transition-all duration-300"
              >
                <Link href="/readings" className="flex items-center gap-2">
                  <GiCursedStar className="size-5 transition-transform group-hover:scale-110 duration-300" />
                  <span>Ask Oracle</span>
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-6 flex flex-col sm:flex-row items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["cura", "mihaela", "rada", "maria"].map((name) => (
                    <Avatar key={name} className="size-8 border-2 border-background">
                      <AvatarImage
                        src={`https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/testimonials/${name}.webp`}
                        alt={name}
                      />
                    </Avatar>
                  ))}
                </div>
                <span className="font-sans italic">Join 10,000+ cosmic seekers</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-2 font-sans italic">
                <span className="text-primary">★★★★★</span>
                <span>Powered by precision astronomy</span>
              </div>
            </motion.div>
          </div>

          {/* ── Right: Retrograde Carousel ─────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-1 lg:order-2 flex flex-col items-center justify-center"
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-64 h-64 md:w-80 md:h-80 bg-primary/10 rounded-full blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Decorative rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[110%] h-[110%] max-w-[500px] max-h-[500px] rounded-full border border-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/40" />
              </motion.div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[95%] h-[95%] max-w-[440px] max-h-[440px] rounded-full border border-dashed border-primary/[0.07]"
                animate={{ rotate: -360 }}
                transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Carousel container */}
            <div className="relative w-full max-w-[340px] md:max-w-[420px] lg:max-w-[460px] aspect-square flex items-center justify-center">
              {windows.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <RetrogradeSlide
                      window={windows[activeSlide % windows.length]}
                      isActive={true}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="text-center text-muted-foreground text-sm font-serif">
                  Computing planetary positions...
                </div>
              )}
            </div>

            {/* Slide indicators */}
            {windows.length > 1 && (
              <SlideIndicators
                count={windows.length}
                active={activeSlide % windows.length}
                onSelect={handleSlideSelect}
              />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}