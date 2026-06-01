"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiMazeCornea, GiCursedStar } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { format, differenceInDays } from "date-fns";

/**
 * Hero0 — Final hero with 3 auto-rotating slides:
 *   Slide 0 (4s): Full natal chart
 *   Slide 1 (3 × 2.5s): Big Three (Sun → Moon → Rising)
 *   Slide 2 (max 4 × 2.5s): Retrograde planets
 * All loop continuously.
 */

const SAMPLE_CHART = calculateFullChart(1995, 6, 15, 12, 0, 40.7128, -74.006);

/* ── Timing config ──────────────────────────────────────────── */
const SLIDE_DURATIONS: Record<string, number> = {
  chart: 4_000,
  placement: 2_500,
  retrograde: 2_500,
};

/* ── Psychological weight ranking (highest personal impact first) ── */
const PSYCHOLOGICAL_WEIGHT: Record<string, number> = {
  mercury: 1,
  venus: 2,
  mars: 3,
  saturn: 4,
  jupiter: 5,
  uranus: 6,
  neptune: 7,
  pluto: 8,
};

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

const MAX_RETROGRADE_SHOWN = 4;

/* ── Big Three placements ──────────────────────────────────── */

interface PlacementInfo {
  label: string;
  symbol: string;
  signId: string;
}

function getPlacements(): PlacementInfo[] {
  const placements: PlacementInfo[] = [];
  const sunP = SAMPLE_CHART.planets.find((p) => p.id === "sun");
  const moonP = SAMPLE_CHART.planets.find((p) => p.id === "moon");
  const ascP = SAMPLE_CHART.ascendant;
  if (sunP) placements.push({ label: "Sun Sign", symbol: "☉", signId: sunP.signId });
  if (moonP) placements.push({ label: "Moon Sign", symbol: "☽", signId: moonP.signId });
  if (ascP) placements.push({ label: "Rising Sign", symbol: "↑", signId: ascP.signId });
  return placements;
}

const PLACEMENTS = getPlacements();

/* ── Retrograde logic ──────────────────────────────────────── */

interface RetrogradeWindow {
  planetId: string;
  planetName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  daysLeft: number | null;
}

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

function getRetrogradeSlides(): RetrogradeWindow[] {
  const windows: RetrogradeWindow[] = [];
  for (const planetId of RETROGRADE_PLANETS) {
    const w = findNextRetrogradeWindow(planetId, new Date());
    if (w) windows.push(w);
  }
  // Sort: active retrogrades first (by weight), then upcoming (by weight)
  const active = windows
    .filter((w) => w.isActive)
    .sort((a, b) => (PSYCHOLOGICAL_WEIGHT[a.planetId] ?? 99) - (PSYCHOLOGICAL_WEIGHT[b.planetId] ?? 99));
  const upcoming = windows
    .filter((w) => !w.isActive)
    .sort((a, b) => (PSYCHOLOGICAL_WEIGHT[a.planetId] ?? 99) - (PSYCHOLOGICAL_WEIGHT[b.planetId] ?? 99));
  return [...active, ...upcoming].slice(0, MAX_RETROGRADE_SHOWN);
}

/* ── Sign Card ──────────────────────────────────────────────── */

function SignCard({ placement }: { placement: PlacementInfo }) {
  const signData = compositionalSigns.find((s) => s.id === placement.signId);
  const signUI = zodiacUIConfig[placement.signId];
  if (!signData || !signUI) return null;

  const elementUi = elementUIConfig[signData.element];
  const Icon = signUI.icon;
  const ElementIcon = elementUi.icon;
  const styles = elementUi.styles;

  // Self-managed reveal — resets on every sign change, exactly like hero4's SignSlide
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [placement.signId]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background constellation — zoom out + fade, matching hero4 */}
      <img
        src={signUI.constellationUrl}
        alt=""
        className="absolute left-1/2 top-1/2 object-contain pointer-events-none transition-all duration-1000"
        style={{
          opacity: revealed ? 0.12 : 0.35,
          width: "80%",
          height: "80%",
          transform: `translate(-50%, -55%) scale(${revealed ? 1.5 : 2})`,
          filter: `drop-shadow(0 0 20px ${styles.glow})`,
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.4 : 0,
          backgroundColor: styles.glow,
        }}
      />

      <motion.p
        className="text-xs uppercase tracking-[0.3em] font-serif mb-7"
        style={{ color: "#ffffff" }}
      >
        {placement.symbol} {placement.label}
      </motion.p>

      {/* Icon + Frame — rotation reveal, matching hero4 */}
      <div className="relative w-56 h-56 mb-7">
        <img
          src={elementUi.frameUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-all duration-[1.4s] ease-out"
          style={{
            opacity: revealed ? 0.55 : 0,
            transform: revealed ? "rotate(45deg)" : "rotate(0deg)",
            filter: `drop-shadow(0 0 18px ${styles.glow})`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: revealed ? 0.3 : 0,
            backgroundColor: styles.glow,
          }}
        />
        <Icon
          className="absolute inset-0 m-auto w-[6rem] h-[6rem] transition-all duration-700"
          style={{
            color: revealed ? "#ffffff" : styles.secondary,
            transform: revealed ? "scale(1.1)" : "scale(1)",
            filter: revealed
              ? `drop-shadow(0 0 14px ${styles.glow})`
              : `drop-shadow(0 0 6px ${styles.glow})`,
          }}
        />
      </div>

      {/* Name */}
      <h2
        className="text-5xl lg:text-[4.25rem] font-serif tracking-wide transition-all duration-700"
        style={{
          color: revealed ? "#ffffff" : styles.secondary,
          textShadow: revealed
            ? `0 0 24px ${styles.glow}, 0 0 48px ${styles.glow}40`
            : "none",
          transform: revealed ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {signData.name}
      </h2>

      {/* Archetype · Element */}
      <div
        className="flex items-center gap-2 mt-3 transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-bold"
          style={{ color: styles.secondary }}
        >
          {signData.archetypeName}
        </span>
        <span style={{ color: `${styles.primary}40` }}>·</span>
        <ElementIcon className="w-3.5 h-3.5" style={{ color: styles.primary }} />
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-medium"
          style={{ color: styles.secondary }}
        >
          {signData.element}
        </span>
      </div>
    </div>
  );
}

/* ── Retrograde Slide (matching Big Three layout) ─────────── */

function RetrogradeCard({ retroWindow }: { retroWindow: RetrogradeWindow }) {
  const ui = planetUIConfig[retroWindow.planetId];
  const themeColor = ui?.themeColor ?? "#f97316";
  const symbol = ui?.rulerSymbol ?? "○";
  const imageScale = ui?.imageScale ?? 1;

  // Self-managed reveal — resets on every planet change
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [retroWindow.planetId]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.45 : 0,
          backgroundColor: themeColor,
        }}
      />

      {/* Label */}
      <motion.p
        className="text-xs uppercase tracking-[0.3em] font-serif mb-7"
        style={{ color: "#ffffff" }}
      >
        {symbol} {retroWindow.isActive ? "Retrograde Active" : "Next Retrograde"}
      </motion.p>

      {/* Planet image */}
      <div className="relative w-56 h-56 mb-7">
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: revealed ? 0.3 : 0,
            backgroundColor: themeColor,
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full h-full"
        >
          {ui?.imageUrl ? (
            <img
              src={ui.imageUrl}
              alt={retroWindow.planetName}
              className="w-full h-full object-contain"
              style={{ transform: `scale(${imageScale})`, filter: revealed ? "brightness(1.1)" : "brightness(0.8)" }}
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-6xl border border-border/30"
              style={{ color: themeColor }}
            >
              {symbol}
            </div>
          )}
        </motion.div>
      </div>

      {/* Planet name */}
      <h2
        className="text-5xl lg:text-[4.25rem] font-serif tracking-wide transition-all duration-700"
        style={{
          color: revealed ? "#ffffff" : "rgba(255,255,255,0.5)",
          textShadow: revealed
            ? `0 0 24px ${themeColor}, 0 0 48px ${themeColor}40`
            : "none",
          transform: revealed ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {retroWindow.planetName}
      </h2>

      {/* Duration · Date interval */}
      <div
        className="flex items-center gap-2 mt-3 transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary"
        >
          {retroWindow.daysLeft !== null && retroWindow.daysLeft > 0
            ? `${retroWindow.daysLeft} ${retroWindow.isActive ? "days left" : "days away"}`
            : retroWindow.isActive ? "Active now" : "—"}
        </span>
        <span className="text-primary/25">·</span>
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-medium text-primary"
        >
          {format(retroWindow.startDate, "MMM d")} – {format(retroWindow.endDate, "MMM d")}
        </span>
      </div>
    </div>
  );
}

/* ── Slide Indicators (3 dots) ─────────────────────────────── */

function SlideIndicators({
  active,
  onSelect,
}: {
  active: 0 | 1 | 2;
  onSelect: (i: 0 | 1 | 2) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {([0, 1, 2] as const).map((i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="relative h-1.5 rounded-full transition-all duration-500 cursor-pointer"
          style={{
            width: i === active ? 28 : 8,
            backgroundColor: i === active ? "var(--primary)" : "rgba(255,255,255,0.15)",
          }}
        >
          {i === active && (
            <motion.div
              className="absolute inset-0 rounded-full bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function Hero0() {
  const [mounted, setMounted] = React.useState(false);
  // 0 = chart, 1 = big-three, 2 = retrogrades
  const [phase, setPhase] = React.useState<0 | 1 | 2>(0);
  // Sub-slide index within each phase
  const [placementIdx, setPlacementIdx] = React.useState(0);
  const [retroIdx, setRetroIdx] = React.useState(0);
  const [retroSlides, setRetroSlides] = React.useState<RetrogradeWindow[]>([]);

  React.useEffect(() => {
    setMounted(true);
    setRetroSlides(getRetrogradeSlides());
  }, []);

  const retroCount = retroSlides.length;

  // Phase & sub-slide auto-rotation
  React.useEffect(() => {
    if (!mounted) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 0) {
      // Chart stays for 4s → phase 1
      timer = setTimeout(() => {
        setPhase(1);
        setPlacementIdx(0);
      }, SLIDE_DURATIONS.chart);
    } else if (phase === 1) {
      // Big Three: each placement 2.5s
      timer = setTimeout(() => {
        if (placementIdx < PLACEMENTS.length - 1) {
          setPlacementIdx((prev) => prev + 1);
        } else {
          // All placements done → phase 2 (or back to 0 if no retrogrades)
          if (retroCount > 0) {
            setPhase(2);
            setRetroIdx(0);
          } else {
            setPhase(0);
          }
        }
      }, SLIDE_DURATIONS.placement);
    } else {
      // Retrogrades: each planet 2.5s
      timer = setTimeout(() => {
        if (retroIdx < retroCount - 1) {
          setRetroIdx((prev) => prev + 1);
        } else {
          // All retrogrades done → back to chart
          setPhase(0);
          setRetroIdx(0);
        }
      }, SLIDE_DURATIONS.retrograde);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [mounted, phase, placementIdx, retroIdx, retroCount]);

  // Current retrograde window to display
  const currentRetro = retroCount > 0 ? retroSlides[retroIdx % retroCount] : null;

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vh] opacity-[0.04]"
          style={{ background: "radial-gradient(circle at 70% 50%, var(--sun) 0%, transparent 50%)" }}
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
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-serif text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Precision Astronomy
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-2"
            >
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                <span className="block text-foreground">Navigate Your</span>
                <span className="block whitespace-nowrap bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
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
                  <GiCursedStar className="size-5 transition-transform group-hover:scale-110 duration:300" />
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

          {/* ── Right: Slides ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
            animate={mounted ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-1 lg:order-2 flex flex-col items-center justify-center"
          >
            {/* Ambient golden glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-72 h-72 md:w-[28rem] md:h-[28rem] bg-primary/10 rounded-full blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Slow-rotating outer decorative ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[110%] h-[110%] max-w-[580px] max-h-[580px] rounded-full border border-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-1.5 rounded-full bg-primary/30" />
              </motion.div>
            </div>

            {/* Counter-rotating inner ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[95%] h-[95%] max-w-[520px] max-h-[520px] rounded-full border border-dashed border-primary/[0.07]"
                animate={{ rotate: -360 }}
                transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* ── Phase 0: Birth Chart ── */}
            <AnimatePresence mode="wait">
              {phase === 0 && (
                <motion.div
                  key="chart"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-[400px] md:max-w-[500px] lg:max-w-[560px] aspect-square"
                >
                  <ChartCircleView data={SAMPLE_CHART} />
                </motion.div>
              )}

              {/* ── Phase 1: Big Three ── */}
              {phase === 1 && PLACEMENTS[placementIdx] && (
                <motion.div
                  key={`placement-${placementIdx}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-[420px] md:max-w-[520px] lg:max-w-[580px] aspect-square flex items-center justify-center"
                >
                  <SignCard
                    placement={PLACEMENTS[placementIdx]}
                  />
                </motion.div>
              )}

              {/* ── Phase 2: Retrogrades ── */}
              {phase === 2 && currentRetro && (
                <motion.div
                  key={`retro-${currentRetro.planetId}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-[420px] md:max-w-[520px] lg:max-w-[580px] aspect-square flex items-center justify-center"
                >
                  <RetrogradeCard retroWindow={currentRetro} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide indicators — absolutely positioned */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <SlideIndicators
                active={phase}
                onSelect={(i) => {
                  setPhase(i);
                  setPlacementIdx(0);
                  setRetroIdx(0);
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}