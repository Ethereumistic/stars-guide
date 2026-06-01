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
import { ElementType } from "@/astrology/elements";
import { ELEMENTS_LEARN } from "@/astrology/elements";

/**
 * Hero4 — "Zodiac Carousel"
 *
 * Split layout: editorial text left, auto-rotating zodiac sign carousel right.
 * Each slide shows a zodiac sign with constellation watermark, element frame,
 * icon reveal animation, and archetype label — directly inspired by learn-slide.
 * The category nav below lets viewers pick Signs/Elements to cycle through.
 */

/* ── Helpers ──────────────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSign() {
  const data = pick(compositionalSigns);
  return { data, ui: zodiacUIConfig[data.id] };
}

function randomElement() {
  const keys: ElementType[] = ["Fire", "Earth", "Air", "Water"];
  const key = pick(keys);
  return { key, ui: elementUIConfig[key], learn: ELEMENTS_LEARN[key] };
}

/* ── Sign Slide ──────────────────────────────────────────── */

function SignSlide({
  data,
  ui,
}: {
  data: (typeof compositionalSigns)[number];
  ui: (typeof zodiacUIConfig)[string];
}) {
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [data.id]);

  const elementUi = elementUIConfig[data.element];
  const Icon = ui.icon;
  const ElementIcon = elementUi.icon;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background constellation */}
      <img
        src={ui.constellationUrl}
        alt=""
        className="absolute left-1/2 top-1/2 object-contain pointer-events-none transition-all duration-1000"
        style={{
          opacity: revealed ? 0.12 : 0.35,
          width: "65%",
          height: "65%",
          transform: `translate(-50%, -55%) scale(${revealed ? 1.5 : 2})`,
          filter: `drop-shadow(0 0 20px ${elementUi.styles.glow})`,
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.4 : 0,
          backgroundColor: elementUi.styles.glow,
        }}
      />

      {/* Icon + Frame */}
      <div className="relative w-28 h-28 mb-6">
        <img
          src={elementUi.frameUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-all duration-[1.4s] ease-out"
          style={{
            opacity: revealed ? 0.55 : 0,
            transform: revealed ? "rotate(45deg)" : "rotate(0deg)",
            filter: `drop-shadow(0 0 18px ${elementUi.styles.glow})`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: revealed ? 0.3 : 0,
            backgroundColor: elementUi.styles.glow,
          }}
        />
        <Icon
          className="absolute inset-0 m-auto w-14 h-14 transition-all duration-700"
          style={{
            color: revealed ? "#ffffff" : elementUi.styles.secondary,
            transform: revealed ? "scale(1.1)" : "scale(1)",
            filter: revealed
              ? `drop-shadow(0 0 14px ${elementUi.styles.glow})`
              : `drop-shadow(0 0 6px ${elementUi.styles.glow})`,
          }}
        />
      </div>

      {/* Name */}
      <h2
        className="text-4xl lg:text-5xl font-serif tracking-wide transition-all duration-700"
        style={{
          color: revealed ? "#ffffff" : elementUi.styles.secondary,
          textShadow: revealed
            ? `0 0 24px ${elementUi.styles.glow}, 0 0 48px ${elementUi.styles.glow}40`
            : "none",
          transform: revealed ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {data.name}
      </h2>

      {/* Archetype + Element */}
      <div
        className="flex items-center gap-2 mt-3 transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.25em] mt-1 font-bold"
          style={{ color: elementUi.styles.secondary }}
        >
          {data.archetypeName}
        </span>
        <span style={{ color: `${elementUi.styles.primary}40` }}>·</span>
        <ElementIcon
          className="w-4 h-4"
          style={{ color: elementUi.styles.primary }}
        />
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-medium"
          style={{ color: elementUi.styles.secondary }}
        >
          {data.element} · {data.modality}
        </span>
      </div>
    </div>
  );
}

/* ── Element Slide ────────────────────────────────────────── */

function ElementSlide({
  elementKey,
  ui,
  learn,
}: {
  elementKey: ElementType;
  ui: (typeof elementUIConfig)[ElementType];
  learn: (typeof ELEMENTS_LEARN)[ElementType];
}) {
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [elementKey]);

  const ElementIcon = ui.icon;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-[80px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.45 : 0,
          backgroundColor: ui.styles.glow,
        }}
      />

      {/* Icon + Frame */}
      <div className="relative w-28 h-28 mb-6">
        <img
          src={ui.frameUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-all duration-[1.4s] ease-out"
          style={{
            opacity: revealed ? 0.55 : 0,
            transform: revealed ? "rotate(45deg)" : "rotate(0deg)",
            filter: `drop-shadow(0 0 18px ${ui.styles.glow})`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: revealed ? 0.3 : 0,
            backgroundColor: ui.styles.glow,
          }}
        />
        <ElementIcon
          className="absolute inset-0 m-auto w-14 h-14 transition-all duration-700"
          style={{
            color: revealed ? "#ffffff" : ui.styles.secondary,
            transform: revealed ? "scale(1.1)" : "scale(1)",
            filter: revealed
              ? `drop-shadow(0 0 14px ${ui.styles.glow})`
              : `drop-shadow(0 0 6px ${ui.styles.glow})`,
          }}
        />
      </div>

      {/* Name */}
      <h2
        className="text-4xl lg:text-5xl font-serif tracking-wide transition-all duration-700"
        style={{
          color: revealed ? "#ffffff" : ui.styles.secondary,
          textShadow: revealed
            ? `0 0 24px ${ui.styles.glow}, 0 0 48px ${ui.styles.glow}40`
            : "none",
          transform: revealed ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {elementKey}
      </h2>

      {/* Tagline */}
      <p
        className="text-[10px] uppercase tracking-[0.25em] mt-3 font-bold transition-opacity duration-500"
        style={{
          opacity: revealed ? 1 : 0,
          color: ui.styles.secondary,
        }}
      >
        {learn.tagline}
      </p>
    </div>
  );
}

/* ── Category Nav ─────────────────────────────────────────── */

const CATEGORIES = [
  { key: "signs", label: "Signs" },
  { key: "elements", label: "Elements" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function CategoryNav({
  active,
  onPick,
}: {
  active: CategoryKey;
  onPick: (k: CategoryKey) => void;
}) {
  const ariesUI = zodiacUIConfig.aries;
  const fireUI = elementUIConfig.Fire;
  const FireIcon = fireUI.icon;
  const AriesIcon = ariesUI.icon;

  const items = [
    { key: "signs" as CategoryKey, label: "Signs", icon: <AriesIcon className="w-9 h-9 text-primary" /> },
    { key: "elements" as CategoryKey, label: "Elements", icon: <FireIcon className="w-9 h-9" style={{ color: fireUI.styles.primary }} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <motion.button
            key={item.key}
            onClick={() => onPick(item.key)}
            className="flex flex-col items-center justify-center aspect-square rounded-xl border p-2 text-center cursor-pointer transition-colors"
            style={{
              borderColor: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              backgroundColor: isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
            }}
            whileHover={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <div className="relative flex items-center justify-center mb-1.5">
              {item.icon}
            </div>
            <p className="text-[10px] font-serif uppercase tracking-wider leading-tight text-white/45">
              {item.label}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Slide Indicators ─────────────────────────────────────── */

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

export function Hero4() {
  const [mounted, setMounted] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [category, setCategory] = React.useState<CategoryKey>("signs");

  // Randomized states
  const [sign, setSign] = React.useState(randomSign);
  const [element, setElement] = React.useState(randomElement);

  // Sign pool for cycling
  const signPool = React.useMemo(() => {
    const shuffled = [...compositionalSigns].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, []);

  const elementPool: ElementType[] = React.useMemo(
    () => ["Fire", "Earth", "Air", "Water"],
    []
  );

  const totalSlides = category === "signs" ? signPool.length : elementPool.length;

  // Auto-rotate every 3s
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % totalSlides;
        // Randomize content for variety on each cycle
        if (category === "signs") {
          setSign(randomSign());
        } else {
          setElement(randomElement());
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [mounted, category, totalSlides]);

  const handleCategoryChange = (key: CategoryKey) => {
    setCategory(key);
    setActiveSlide(0);
    if (key === "signs") setSign(randomSign());
    else setElement(randomElement());
  };

  const handleSlideSelect = (i: number) => {
    setActiveSlide(i);
  };

  // Get current slide data
  const currentSign = signPool[activeSlide % signPool.length];
  const currentElement = elementPool[activeSlide % elementPool.length];
  const currentSignUI = currentSign ? zodiacUIConfig[currentSign.id] : undefined;
  const currentElementUI = elementUIConfig[currentElement];
  const currentElementLearn = ELEMENTS_LEARN[currentElement];

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
              Learn Astrology
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

            {/* Category nav cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="w-full max-w-[240px]"
            >
              <CategoryNav active={category} onPick={handleCategoryChange} />
            </motion.div>

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

          {/* ── Right: Zodiac Carousel ─────────────────────── */}
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${category}-${activeSlide}`}
                  initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {category === "signs" && currentSign && currentSignUI && (
                    <SignSlide data={currentSign} ui={currentSignUI} />
                  )}
                  {category === "elements" && currentElementUI && currentElementLearn && (
                    <ElementSlide
                      elementKey={currentElement}
                      ui={currentElementUI}
                      learn={currentElementLearn}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide indicators */}
            <SlideIndicators
              count={totalSlides}
              active={activeSlide}
              onSelect={handleSlideSelect}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}