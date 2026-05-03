"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { compositionalSigns } from "@/astrology/signs";
import { compositionalAspects } from "@/astrology/aspects";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { aspectUIConfig } from "@/config/aspects-ui";
import {
  elementUIConfig,
  type ElementUIConfigData,
} from "@/config/elements-ui";
import { ELEMENTS_LEARN, type ElementType } from "@/astrology/elements";
import type { SignData } from "@/astrology/signs";
import type { PlanetUIConfig } from "@/config/planet-ui";
import type { AspectUIConfig } from "@/config/aspects-ui";

/* ── Random helpers ──────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSign(): { data: SignData; ui: (typeof zodiacUIConfig)[string] } {
  const data = pick(compositionalSigns);
  return { data, ui: zodiacUIConfig[data.id] };
}

function randomPlanet(): { key: string; ui: PlanetUIConfig } {
  const entries = Object.entries(planetUIConfig).filter(
    ([k]) => !["part_of_fortune", "rising"].includes(k),
  );
  const [key, ui] = pick(entries);
  return { key, ui };
}

function randomAspect(): { key: string; ui: AspectUIConfig } {
  const entries = Object.entries(aspectUIConfig);
  const [key, ui] = pick(entries);
  return { key, ui };
}

function randomElement(): {
  key: ElementType;
  ui: ElementUIConfigData;
  learn: (typeof ELEMENTS_LEARN)[ElementType];
} {
  const keys: ElementType[] = ["Fire", "Earth", "Air", "Water"];
  const key = pick(keys);
  return { key, ui: elementUIConfig[key], learn: ELEMENTS_LEARN[key] };
}

/* ── Sign Slide ───────────────────────────────────────────── */

function SignSlide({
  data,
  ui,
}: {
  data: SignData;
  ui: (typeof zodiacUIConfig)[string];
}) {
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, [data]);

  const elementUi = elementUIConfig[data.element];
  const Icon = ui.icon;
  const ElementIcon = elementUi.icon;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Background constellation — centered on the icon */}
      <img
        src={ui.constellationUrl}
        alt=""
        className="absolute left-1/2 top-1/2 object-contain pointer-events-none transition-all duration-1000"
        style={{
          opacity: revealed ? 0.12 : 0.35,
          width: "70%",
          height: "70%",
          transform: `translate(-50%, -60%) scale(${revealed ? 1.5 : 2})`,
          filter: `drop-shadow(0 0 20px ${elementUi.styles.glow})`,
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.45 : 0,
          backgroundColor: elementUi.styles.glow,
        }}
      />

      {/* Icon + Frame */}
      <div className="relative w-90 h-90 mb-8">
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
            opacity: revealed ? 0.35 : 0,
            backgroundColor: elementUi.styles.glow,
          }}
        />
        <Icon
          className="absolute inset-0 m-auto w-42 h-42 transition-all duration-700"
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
        className="text-6xl lg:text-7xl font-serif tracking-wide transition-all duration-700"
        style={{
          color: revealed ? "#ffffff" : elementUi.styles.secondary,
          textShadow: revealed
            ? `0 0 24px ${elementUi.styles.glow}, 0 0 48px ${elementUi.styles.glow}40`
            : "none",
          transform: revealed ? "translateY(0)" : "translateY(12px)",
        }}
      >
        {data.name}
      </h2>

      {/* Archetype */}
      <p
        className="text-xs uppercase tracking-[0.25em] mt-4 font-bold transition-opacity duration-500"
        style={{
          opacity: revealed ? 1 : 0,
          color: elementUi.styles.secondary,
        }}
      >
        {data.archetypeName}
      </p>

      {/* Element badge */}
      <div
        className="flex items-center gap-2 mt-5 transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        <ElementIcon
          className="w-5 h-5"
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

/* ── Planet Slide ─────────────────────────────────────────── */

function PlanetSlide({
  planetKey,
  ui,
}: {
  planetKey: string;
  ui: PlanetUIConfig;
}) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-40 h-40 lg:w-100 lg:h-100 mb-8">
        {/*<div
          className="absolute inset-0 rounded-full blur-[60px] opacity-40 scale-150"
          style={{ backgroundColor: ui.themeColor }}
        />*/}
        {ui.imageUrl ? (
          <img
            src={ui.imageUrl}
            alt={planetKey}
            className="relative w-full h-full object-contain rounded-full"
            style={{ transform: `scale(${ui.imageScale ?? 1})` }}
          />
        ) : (
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center text-5xl border border-border/30"
            style={{ color: ui.themeColor }}
          >
            {ui.rulerSymbol}
          </div>
        )}
      </div>

      <h2 className="text-5xl lg:text-6xl font-serif tracking-wide text-foreground capitalize">
        {ui.rulerSymbol} {planetKey.replace(/_/g, " ")}
      </h2>
    </div>
  );
}

/* ── Aspect Slide ─────────────────────────────────────────── */

function AspectSlide({
  aspectKey,
  ui,
}: {
  aspectKey: string;
  ui: AspectUIConfig;
}) {
  const aspectData = compositionalAspects.find((a) => a.id === aspectKey);
  const name =
    aspectData?.name ??
    aspectKey.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div
        className="relative w-36 h-36 lg:w-90 lg:h-90 flex items-center justify-center rounded-full border border-border/15 mb-8"
        style={{
          background: `radial-gradient(circle at center, ${ui.hexFallback}12 0%, transparent 70%)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-30 scale-125"
          style={{ backgroundColor: ui.hexFallback }}
        />
        <svg
          viewBox="0 0 24 24"
          className="relative w-20 h-20 lg:w-24 lg:h-24"
          fill="none"
          stroke={ui.hexFallback}
          strokeWidth={1.1}
        >
          <path d={ui.glyphPath} />
        </svg>
      </div>

      <h2 className="text-5xl lg:text-6xl font-serif tracking-wide text-foreground">
        {name}
      </h2>

      <div className="flex items-center gap-3 mt-5">
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border"
          style={{
            color: ui.hexFallback,
            borderColor: `${ui.hexFallback}40`,
            backgroundColor: `${ui.hexFallback}10`,
          }}
        >
          {ui.badgeLabel}
        </span>
        {aspectData && (
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium px-3 py-1 rounded-full bg-card border border-border/40 text-muted-foreground">
            {aspectData.degreesExact}
          </span>
        )}
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
  ui: ElementUIConfigData;
  learn: (typeof ELEMENTS_LEARN)[ElementType];
}) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-40 h-40 lg:w-48 lg:h-48 mb-8">
        <div
          className="absolute inset-0 blur-[60px] opacity-30 scale-125"
          style={{ backgroundColor: ui.styles.primary }}
        />
        <img
          src={ui.frameUrl}
          alt={elementKey}
          className="relative w-full h-full object-contain"
        />
      </div>

      <h2 className="text-5xl lg:text-6xl font-serif tracking-wide text-foreground">
        {elementKey}
      </h2>
      <p
        className="text-[11px] uppercase tracking-[0.25em] mt-3 font-bold"
        style={{ color: ui.styles.primary }}
      >
        {learn.tagline}
      </p>

      <div className="flex gap-3 mt-6 flex-wrap justify-center max-w-xs">
        {learn.signs.map((s) => (
          <span
            key={s}
            className="text-[10px] uppercase tracking-widest font-medium px-3 py-1 rounded-full bg-card/40 border border-border/40 text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Category Nav Cards ───────────────────────────────────── */

/** Representative data shown on each card before the user selects it */
const CARD_REPRESENTATIVES = {
  sign: {
    id: "aries",
    label: "Signs",
  },
  planet: {
    id: "venus",
    label: "Planets",
  },
  aspect: {
    id: "conjunction",
    label: "Aspects",
  },
  element: {
    id: "Fire",
    label: "Elements",
  },
} as const;

function CategoryNavCards({
  activeIndex,
  onPick,
}: {
  activeIndex: number;
  onPick: (i: number) => void;
}) {
  const signUI = zodiacUIConfig[CARD_REPRESENTATIVES.sign.id];
  const planetUI = planetUIConfig[CARD_REPRESENTATIVES.planet.id];
  const aspectUI = aspectUIConfig[CARD_REPRESENTATIVES.aspect.id];
  const elementUI =
    elementUIConfig[CARD_REPRESENTATIVES.element.id as ElementType];
  const ElementIcon = elementUI.icon;
  const SignIcon = signUI.icon;

  const cards = [
    {
      label: CARD_REPRESENTATIVES.sign.label,
      color: "var(--fire-glow)",
      content: <SignIcon className="w-10 h-10 text-primary" />,
    },
    {
      label: CARD_REPRESENTATIVES.planet.label,
      color: planetUI.themeColor,
      content: planetUI.imageUrl ? (
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-12 h-12 rounded-full blur-xl opacity-30"
            style={{ backgroundColor: planetUI.themeColor }}
          />
          <img
            src={planetUI.imageUrl}
            alt="Venus"
            className="relative w-10 h-10 object-contain"
            style={{
              transform: `scale(${planetUI.imageScale ?? 1})`,
              filter: "brightness(1.15)",
            }}
          />
        </div>
      ) : (
        <span className="text-2xl text-white">{planetUI.rulerSymbol}</span>
      ),
    },
    {
      label: CARD_REPRESENTATIVES.aspect.label,
      color: "var(--primary)",
      content: <span className="text-2xl text-primary font-medium">☌</span>,
    },
    {
      label: CARD_REPRESENTATIVES.element.label,
      color: elementUI.styles.primary,
      content: <ElementIcon className="w-10 h-10 text-primary" />,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((card, i) => {
        const isActive = i === activeIndex;
        return (
          <motion.button
            key={card.label}
            onClick={() => onPick(i)}
            className="flex flex-col items-center justify-center aspect-square rounded-xl border p-2 text-center cursor-pointer transition-colors"
            style={{
              borderColor: "rgba(255,255,255,0.05)",
              backgroundColor: isActive
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.02)",
            }}
            whileHover={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
          >
            {/* Icon */}
            <div className="relative flex items-center justify-center mb-1.5">
              {card.content}
            </div>

            {/* Title */}
            <p
              className="text-[10px] font-serif uppercase tracking-wider leading-tight transition-colors"
              style={{
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {card.label}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

interface LearnSlideProps {
  isActive?: boolean;
  wasActive?: boolean;
}

export function LearnSlide({ isActive }: LearnSlideProps) {
  const [index, setIndex] = React.useState(0);

  /* Independent randomized states — re-randomized every time their slot comes up */
  const [sign, setSign] = React.useState(randomSign);
  const [planet, setPlanet] = React.useState(randomPlanet);
  const [aspect, setAspect] = React.useState(randomAspect);
  const [element, setElement] = React.useState(randomElement);

  /* Auto-rotate every 2 seconds, randomizing the upcoming slot */
  React.useEffect(() => {
    if (!isActive) return;

    let raf: number;
    const start = performance.now();
    const duration = 2000;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (elapsed >= duration) {
        setIndex((prev) => {
          const next = (prev + 1) % 4;
          // Randomize the item for the slot we're entering
          if (next === 0) setSign(randomSign());
          if (next === 1) setPlanet(randomPlanet());
          if (next === 2) setAspect(randomAspect());
          if (next === 3) setElement(randomElement());
          return next;
        });
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, index]); // restart timer whenever index changes (new cycle)

  const handlePick = (i: number) => {
    if (i === 0) setSign(randomSign());
    if (i === 1) setPlanet(randomPlanet());
    if (i === 2) setAspect(randomAspect());
    if (i === 3) setElement(randomElement());
    setIndex(i);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 h-full max-w-[1600px] mx-auto w-full items-center px-6 md:px-12 py-8 lg:py-0">
      {/* ── Left Column ── */}
      <motion.div
        className="flex flex-col gap-8 col-span-1"
        initial={{ opacity: 0, x: -40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-5">
          <span className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-primary/5 border-primary/10 text-primary">
            Zodiac Library
          </span>
          <h2 className="text-5xl lg:text-6xl font-serif tracking-tight text-nowrap leading-[1.05]">
            CELESTIAL ARCHIVE
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
            Learn about the signs, planets, aspects, and elements that compose
            your cosmic blueprint. A living index of astrological knowledge.
          </p>
        </div>

        {/* Category square cards */}
        <CategoryNavCards activeIndex={index} onPick={handlePick} />
      </motion.div>

      {/* ── Right Column (Free-floating carousel) ── */}
      <motion.div
        className="lg:col-span-2 relative h-[520px] lg:h-[800px]"
        initial={{ opacity: 0, x: 40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${["Sign", "Planet", "Aspect", "Element"][index]}-${index}`}
            initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
          >
            {index === 0 && <SignSlide data={sign.data} ui={sign.ui} />}
            {index === 1 && (
              <PlanetSlide planetKey={planet.key} ui={planet.ui} />
            )}
            {index === 2 && (
              <AspectSlide aspectKey={aspect.key} ui={aspect.ui} />
            )}
            {index === 3 && (
              <ElementSlide
                elementKey={element.key}
                ui={element.ui}
                learn={element.learn}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Ambient floating orbs for atmosphere */}
        <div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-primary/20 blur-[1px] animate-pulse pointer-events-none" />
        <div
          className="absolute top-[60%] right-[12%] w-1.5 h-1.5 rounded-full bg-primary/15 blur-[1px] animate-pulse pointer-events-none"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[20%] left-[20%] w-1 h-1 rounded-full bg-primary/10 blur-[1px] animate-pulse pointer-events-none"
          style={{ animationDelay: "2s" }}
        />
      </motion.div>
    </div>
  );
}
