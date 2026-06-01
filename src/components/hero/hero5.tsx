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
import { elementUIConfig, type ElementUIConfigData } from "@/config/elements-ui";
import { ElementType } from "@/astrology/elements";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { compositionalSigns } from "@/astrology/signs";

/**
 * Hero5 — "Planet Carousel"
 *
 * Split layout: editorial text left, auto-rotating planet showcase right.
 * Cycles through all major planets showing their image, current sign,
 * and degree — a live astronomical showcase in the hero.
 */

/* ── Planet Data ───────────────────────────────────────────── */

const PLANET_KEYS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "neptune",
] as const;

interface PlanetSlideData {
  key: string;
  name: string;
  ui: (typeof planetUIConfig)[string];
  signId: string;
  signData: (typeof compositionalSigns)[number] | undefined;
  signUI: (typeof zodiacUIConfig)[string] | undefined;
  elementUi: ElementUIConfigData | undefined;
  longitude: number;
  retrograde: boolean;
}

function buildPlanetSlides(): PlanetSlideData[] {
  return PLANET_KEYS.map((key) => {
    const ui = planetUIConfig[key];
    const telemetry = getPlanetTelemetry(key);
    const signId = telemetry?.signId ?? "aries";
    const signData = compositionalSigns.find((s) => s.id === signId);
    const signUI = zodiacUIConfig[signId];

    const element = (signData?.element ?? "Fire") as ElementType;
    const elementUi = elementUIConfig[element];

    return {
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ui,
      signId,
      signData,
      signUI,
      elementUi,
      longitude: telemetry?.longitude ?? 0,
      retrograde: telemetry?.retrograde ?? false,
    };
  });
}

/* ── Planet Slide ────────────────────────────────────────── */

function PlanetSlide({ data }: { data: PlanetSlideData }) {
  const themeColor = data.ui.themeColor;
  const imageScale = data.ui.imageScale ?? 1;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-[80px] transition-opacity"
        style={{
          backgroundColor: themeColor,
          opacity: 0.2,
        }}
      />

      {/* Planet image */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="relative w-44 h-44 md:w-52 md:h-52 lg:w-64 lg:h-64">
          {data.ui.imageUrl ? (
            <>
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30"
                style={{ backgroundColor: themeColor }}
              />
              <motion.img
                src={data.ui.imageUrl}
                alt={data.name}
                className="relative w-full h-full object-contain"
                style={{ transform: `scale(${imageScale})`, filter: "brightness(1.1)" }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </>
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-5xl border border-border/30"
              style={{ color: themeColor }}
            >
              {data.ui.rulerSymbol}
            </div>
          )}
        </div>
      </div>

      {/* Symbol + Name */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl md:text-3xl font-serif" style={{ color: themeColor }}>
          {data.ui.rulerSymbol}
        </span>
        <h2 className="text-4xl lg:text-5xl font-serif tracking-wide text-foreground">
          {data.name}
        </h2>
      </div>

      {/* Current sign + degree */}
      {data.signData && data.signUI && data.elementUi && (() => {
        const SignIcon = data.signUI.icon;
        const ElementIcon = data.elementUi.icon;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <SignIcon
                className="w-5 h-5"
                style={{ color: data.elementUi.styles.primary }}
              />
              <span
                className="text-sm font-serif uppercase tracking-widest"
                style={{ color: data.elementUi.styles.secondary }}
              >
                Transiting {data.signData.name}
              </span>
            </div>

            {/* Element + Degree */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ElementIcon
                  className="w-3.5 h-3.5"
                  style={{ color: data.elementUi.styles.primary }}
                />
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-medium"
                  style={{ color: data.elementUi.styles.secondary }}
                >
                  {data.signData.element}
                </span>
              </div>
              <span className="text-white/15">|</span>
              <span className="font-mono text-[10px] text-white/40 tracking-wide">
                {data.longitude.toFixed(2)}°
              </span>
              {data.retrograde && (
                <>
                  <span className="text-white/15">|</span>
                  <span className="text-[10px] uppercase tracking-widest text-destructive font-bold">
                    ℞ Rx
                  </span>
                </>
              )}
            </div>
          </motion.div>
        );
      })()}
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
    <div className="flex items-center gap-1.5 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="relative h-1.5 rounded-full transition-all duration-500 cursor-pointer"
          style={{
            width: i === active ? 20 : 6,
            backgroundColor: i === active ? "var(--primary)" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export function Hero5() {
  const [mounted, setMounted] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [slides, setSlides] = React.useState<PlanetSlideData[]>([]);

  React.useEffect(() => {
    setMounted(true);
    setSlides(buildPlanetSlides());
  }, []);

  // Auto-rotate every 3.5s
  React.useEffect(() => {
    if (!mounted || slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [mounted, slides.length]);

  const handleSlideSelect = (i: number) => {
    setActiveSlide(i);
  };

  const currentSlide = slides[activeSlide % (slides.length || 1)];

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
              Live Planet Positions
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

            {/* Planet ticker strip */}
            {slides.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={mounted ? { opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="pt-6 flex items-center gap-3 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  {slides.slice(0, 5).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        const idx = slides.findIndex((sl) => sl.key === s.key);
                        if (idx >= 0) setActiveSlide(idx);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer hover:border-primary/40"
                      style={{
                        borderColor: slides[activeSlide]?.key === s.key ? "var(--primary)" : "rgba(255,255,255,0.08)",
                        backgroundColor: slides[activeSlide]?.key === s.key ? "rgba(255,255,255,0.04)" : "transparent",
                      }}
                    >
                      {s.ui.imageUrl ? (
                        <img
                          src={s.ui.imageUrl}
                          alt={s.name}
                          className="w-5 h-5 object-contain"
                          style={{ transform: `scale(${s.ui.imageScale ?? 1})`, filter: "brightness(1.1)" }}
                        />
                      ) : (
                        <span className="text-xs" style={{ color: s.ui.themeColor }}>{s.ui.rulerSymbol}</span>
                      )}
                    </button>
                  ))}
                  <span className="text-white/20 mx-1">·</span>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">
                    {slides.length} planets
                  </span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="flex items-center gap-2 font-sans italic">
                  <span className="text-primary">★★★★★</span>
                  <span>Precision astronomy</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right: Planet Carousel ─────────────────────── */}
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
              {currentSlide && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <PlanetSlide data={currentSlide} />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Slide indicators */}
            {slides.length > 1 && (
              <SlideIndicators
                count={slides.length}
                active={activeSlide}
                onSelect={handleSlideSelect}
              />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}