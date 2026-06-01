"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiMazeCornea, GiCursedStar } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";

/**
 * Hero2 — "Big Three Carousel"
 *
 * Split layout: editorial text left, auto-rotating carousel right.
 * The carousel cycles through Sun, Moon, and Rising signs with the
 * reveal-card aesthetic from the onboarding reveal step — constellation
 * watermarks, element frames, glowing transitions.
 */

const SAMPLE_CHART = calculateFullChart(1995, 6, 15, 12, 0, 40.7128, -74.006);

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

  if (sunP) {
    placements.push({ label: "Sun Sign", symbol: "☉", signId: sunP.signId });
  }
  if (moonP) {
    placements.push({ label: "Moon Sign", symbol: "☽", signId: moonP.signId });
  }
  if (ascP) {
    placements.push({ label: "Rising Sign", symbol: "↑", signId: ascP.signId });
  }

  return placements;
}

const PLACEMENTS = getPlacements();

/* ── Sign Card Slide ────────────────────────────────────── */

function SignCard({ placement, isRevealed }: { placement: PlacementInfo; isRevealed: boolean }) {
  const signData = compositionalSigns.find((s) => s.id === placement.signId);
  const signUI = zodiacUIConfig[placement.signId];
  if (!signData || !signUI) return null;

  const elementUi = elementUIConfig[signData.element];
  const Icon = signUI.icon;
  const ElementIcon = elementUi.icon;
  const styles = elementUi.styles;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background constellation */}
      <img
        src={signUI.constellationUrl}
        alt=""
        className="absolute left-1/2 top-1/2 object-contain pointer-events-none transition-all duration-1000"
        style={{
          opacity: isRevealed ? 0.12 : 0.35,
          width: "60%",
          height: "60%",
          transform: `translate(-50%, -60%) scale(${isRevealed ? 1.5 : 2})`,
          filter: `drop-shadow(0 0 20px ${styles.glow})`,
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          opacity: isRevealed ? 0.45 : 0,
          backgroundColor: styles.glow,
        }}
      />

      {/* Placement label */}
      <motion.p
        className="text-[10px] uppercase tracking-[0.3em] font-serif mb-6"
        style={{ color: styles.primary }}
      >
        {placement.symbol} {placement.label}
      </motion.p>

      {/* Icon + Frame */}
      <div className="relative w-28 h-28 mb-6">
        <img
          src={elementUi.frameUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-all duration-[1.4s] ease-out"
          style={{
            opacity: isRevealed ? 0.55 : 0,
            transform: isRevealed ? "rotate(45deg)" : "rotate(0deg)",
            filter: `drop-shadow(0 0 18px ${styles.glow})`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: isRevealed ? 0.3 : 0,
            backgroundColor: styles.glow,
          }}
        />
        <Icon
          className="absolute inset-0 m-auto w-14 h-14 transition-all duration-700"
          style={{
            color: isRevealed ? "#ffffff" : styles.secondary,
            transform: isRevealed ? "scale(1.1)" : "scale(1)",
            filter: isRevealed
              ? `drop-shadow(0 0 14px ${styles.glow})`
              : `drop-shadow(0 0 6px ${styles.glow})`,
          }}
        />
      </div>

      {/* Sign name */}
      <h2
        className="text-4xl lg:text-5xl font-serif tracking-wide transition-all duration-700"
        style={{
          color: isRevealed ? "#ffffff" : styles.secondary,
          textShadow: isRevealed
            ? `0 0 24px ${styles.glow}, 0 0 48px ${styles.glow}40`
            : "none",
          transform: isRevealed ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {signData.name}
      </h2>

      {/* Archetype + Element */}
      <div
        className="flex items-center gap-2 mt-3 transition-opacity duration-500"
        style={{ opacity: isRevealed ? 1 : 0 }}
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

/* ── Slide Indicator Dots ────────────────────────────────── */

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

/* ── Main Component ────────────────────────────────────────── */

export function Hero2() {
  const [mounted, setMounted] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reveal animation after mount
  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Auto-rotate slides every 3.5 seconds
  React.useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % PLACEMENTS.length);
      setRevealed(false);
      // Re-trigger reveal after slide change
      setTimeout(() => setRevealed(true), 200);
    }, 3500);
    return () => clearInterval(interval);
  }, [mounted]);

  const handleSlideSelect = (i: number) => {
    setActiveSlide(i);
    setRevealed(false);
    setTimeout(() => setRevealed(true), 150);
  };

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
      {/* Background: subtle radial gradient */}
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

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-serif text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Your Big Three
            </motion.div>

            {/* Headline */}
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

            {/* Subheadline */}
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

            {/* CTA Buttons */}
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

            {/* Trust Indicators */}
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

          {/* ── Right: Sign Carousel ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-1 lg:order-2 flex flex-col items-center justify-center"
          >
            {/* Ambient golden glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-64 h-64 md:w-80 md:h-80 bg-primary/10 rounded-full blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Slow-rotating outer decorative ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[110%] h-[110%] max-w-[500px] max-h-[500px] rounded-full border border-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-1.5 rounded-full bg-primary/25" />
              </motion.div>
            </div>

            {/* Counter-rotating inner ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[95%] h-[95%] max-w-[440px] max-h-[440px] rounded-full border border-dashed border-primary/[0.07]"
                animate={{ rotate: -360 }}
                transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Carousel container */}
            <div className="relative w-full max-w-[340px] md:max-w-[420px] lg:max-w-[460px] aspect-square flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <SignCard
                    placement={PLACEMENTS[activeSlide]}
                    isRevealed={revealed}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide indicators */}
            <SlideIndicators
              count={PLACEMENTS.length}
              active={activeSlide}
              onSelect={handleSlideSelect}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}