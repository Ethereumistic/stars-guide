"use client";

import { useState } from "react";
import { compositionalSigns } from "@/astrology/signs";
import {
  ELEMENTS_LEARN,
  ELEMENT_CONTENT,
  ELEMENTAL_MANIFESTATIONS,
  KEYWORD_ICONS,
  ElementType,
  ModeType,
} from "@/astrology/elements";
import { elementUIConfig } from "@/config/elements-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion, AnimatePresence } from "motion/react";
import { useParams, notFound } from "next/navigation";
import {
  TbSparkles,
  TbTargetArrow,
  TbLockSquare,
  TbArrowsExchange,
} from "react-icons/tb";
import { GiMightyForce, GiBrokenShield } from "react-icons/gi";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";
import type { ElementLearnData } from "@/astrology/elements";

const MODE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Cardinal: TbTargetArrow,
  Fixed: TbLockSquare,
  Mutable: TbArrowsExchange,
};

// Map each element to its associated modes (in sign order)
const ELEMENT_SIGN_MODES: Record<
  ElementType,
  { sign: string; mode: ModeType }[]
> = {
  Fire: [
    { sign: "aries", mode: "Cardinal" },
    { sign: "leo", mode: "Fixed" },
    { sign: "sagittarius", mode: "Mutable" },
  ],
  Earth: [
    { sign: "taurus", mode: "Fixed" },
    { sign: "virgo", mode: "Mutable" },
    { sign: "capricorn", mode: "Cardinal" },
  ],
  Air: [
    { sign: "gemini", mode: "Mutable" },
    { sign: "libra", mode: "Cardinal" },
    { sign: "aquarius", mode: "Fixed" },
  ],
  Water: [
    { sign: "cancer", mode: "Cardinal" },
    { sign: "scorpio", mode: "Fixed" },
    { sign: "pisces", mode: "Mutable" },
  ],
};

// ── Elemental Blueprint Component ──────────────────────────────────────────
function ElementalBlueprint({
  elementType,
  learnData,
  contentData,
  signModes,
  styles,
  ui,
}: {
  elementType: ElementType;
  learnData: ElementLearnData;
  contentData: { desc: string; keywords: string[] };
  signModes: { sign: string; mode: ModeType }[];
  styles: { primary: string; glow: string };
  ui: {
    frameUrl: string;
    icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>;
  };
}) {
  const [activeSignIdx, setActiveSignIdx] = useState(0);

  // Build sign entries for the tabs
  const signEntries = signModes
    .map(({ sign, mode }) => {
      const signData = compositionalSigns.find((s) => s.id === sign);
      const signUi = zodiacUIConfig[sign];
      const manifestation = ELEMENTAL_MANIFESTATIONS[sign];
      return { sign, mode, signData, signUi, manifestation };
    })
    .filter((e) => e.signData && e.signUi && e.manifestation);

  const activeSign = signEntries[activeSignIdx];
  const ElementIcon = ui.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="mb-36"
    >
      {/* Structured Data Grid — mirrors sign page layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left Column: Archetypal Analysis ────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="border border-white/10 bg-black/50 flex flex-col rounded-md overflow-hidden"
        >
          {/* Growth Path Header */}
          <div className="p-8 md:p-12 border-b border-white/10 relative overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-4">
              Elemental Blueprint
            </span>
            <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight mb-8">
              The Path of {elementType}
            </h2>
            <p className="text-lg text-white/70 leading-relaxed font-serif">
              {learnData.growth}
            </p>
          </div>

          {/* Strengths & Struggles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px">
            {/* Strengths */}
            <div className="p-6 md:p-10 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <GiMightyForce
                  className="size-7"
                  style={{ color: styles.primary }}
                />
                <span className="font-mono text-white/50 text-sm uppercase tracking-[0.3em]">
                  Strengths
                </span>
              </div>
              <ul className="text-base text-white/90 space-y-2.5 list-disc list-inside">
                {learnData.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Struggles */}
            <div className="p-6 md:p-10 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <GiBrokenShield className="size-7 text-white/40" />
                <span className="font-mono text-white/50 text-sm uppercase tracking-[0.3em]">
                  Struggles
                </span>
              </div>
              <ul className="text-base text-white/90 space-y-2.5 list-disc list-inside">
                {learnData.struggles.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* ── Right Column: Elemental Manifestations by Sign ── */}
        <div className="flex flex-col gap-8">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="border border-white/10 bg-black/50 p-8 md:p-12 h-full flex flex-col justify-center relative overflow-hidden rounded-md"
          >
            <div className="relative z-10 space-y-8">
              {/* Sign Tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-0">
                {signEntries.map((entry, idx) => {
                  const SignIcon = entry.signUi!.icon;
                  const isActive = idx === activeSignIdx;
                  return (
                    <button
                      key={entry.sign}
                      onClick={() => setActiveSignIdx(idx)}
                      className={`
                        relative flex items-center gap-2.5 px-4 py-3 transition-colors duration-300
                        ${isActive ? "text-white" : "text-white/30 hover:text-white/60"}
                      `}
                    >
                      {/* Active indicator line */}
                      {isActive && (
                        <motion.div
                          layoutId={`sign-tab-${elementType}`}
                          className="absolute bottom-0 left-0 right-0 h-px"
                          style={{ backgroundColor: styles.primary }}
                          transition={{
                            type: "spring",
                            bounce: 0.15,
                            duration: 0.5,
                          }}
                        />
                      )}
                      <SignIcon
                        className="w-4 h-4"
                        style={{
                          color: isActive ? styles.primary : "currentColor",
                          filter: isActive
                            ? `drop-shadow(0 0 4px ${styles.glow})`
                            : "none",
                        }}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em]">
                        {entry.signData!.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider opacity-40">
                        {entry.mode}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Sign Content */}
              {activeSign && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSign.sign}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-8"
                  >
                    {/* Title + Icon */}
                    <div className="flex items-center justify-between gap-6">
                      <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
                        {activeSign.manifestation!.title}
                      </h2>
                      <div className="relative flex items-center justify-center shrink-0">
                        <img
                          src={ui.frameUrl}
                          className="w-20 h-20 md:w-28 md:h-28 object-cover"
                          alt=""
                        />
                        <ElementIcon
                          className="absolute size-8 md:size-10 drop-shadow-lg opacity-90"
                          style={{ color: styles.primary }}
                        />
                      </div>
                    </div>

                    {/* Insight Quote */}
                    <blockquote
                      className="border-l-2 pl-6 py-2"
                      style={{ borderColor: styles.primary }}
                    >
                      <p className="text-xl text-white/90 italic font-serif leading-relaxed">
                        &ldquo;{activeSign.manifestation!.insight}&rdquo;
                      </p>
                    </blockquote>

                    {/* Axiom + Eternal Path */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">
                          Foundational Axiom
                        </span>
                        <p className="text-sm text-white/60 font-sans">
                          {contentData.desc}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">
                          Eternal Path
                        </span>
                        <p className="text-sm text-white/60 font-sans">
                          {activeSign.manifestation!.path}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </motion.section>
  );
}

export default function ElementDetailPage() {
  const params = useParams();
  const elementParam = params.element as string;

  // Normalize: accept "fire", "Fire", etc.
  const elementId =
    elementParam.charAt(0).toUpperCase() + elementParam.slice(1).toLowerCase();
  const elementType = elementId as ElementType;

  const learnData = ELEMENTS_LEARN[elementType];
  const contentData = ELEMENT_CONTENT[elementType];
  const ui = elementUIConfig[elementType];

  if (!learnData || !contentData || !ui) {
    return notFound();
  }

  const styles = ui.styles;
  const Icon = ui.icon;
  const signModes = ELEMENT_SIGN_MODES[elementType];

  // Collect sign data for the manifestations section
  const signEntries = signModes
    .map(({ sign, mode }) => {
      const signData = compositionalSigns.find((s) => s.id === sign);
      const signUi = zodiacUIConfig[sign];
      const manifestation = ELEMENTAL_MANIFESTATIONS[sign];
      return { sign, mode, signData, signUi, manifestation };
    })
    .filter((e) => e.signData && e.signUi && e.manifestation);

  return (
    <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
      {/* Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
        <div
          className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${styles.primary} 0%, transparent 60%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Learn", href: "/learn" },
            { label: "Elements", href: "/learn/elements" },
          ]}
          currentPage={elementType.toUpperCase()}
          currentPageColor={styles.primary}
          showBorder={false}
        />

        {/* ── Hero Layout ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">
          {/* Left Column: Dossier */}
          <div className="lg:col-span-5 space-y-12">
            {/* Title Block */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8">
                <div className="relative flex items-center justify-center shrink-0">
                  <img
                    src={ui.frameUrl}
                    className="w-40 h-40 md:w-40 md:h-40 object-cover"
                    alt=""
                  />
                  <Icon
                    className="absolute w-12 h-12 md:w-16 md:h-16"
                    style={{
                      color: styles.primary,
                      filter: `drop-shadow(0 0 8px ${styles.glow})`,
                    }}
                  />
                </div>
                <div className="space-y-2 pt-2 md:pt-4 text-center sm:text-left">
                  <h1 className="text-7xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                    {elementType}
                  </h1>
                  <p
                    className="text-2xl md:text-2xl font-serif italic"
                    style={{ color: styles.primary }}
                  >
                    {learnData.tagline}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
              {contentData.keywords.map((kw, i) => {
                const KeywordIcon = KEYWORD_ICONS[kw];
                return (
                  <div
                    key={kw}
                    className="p-3 sm:p-6 flex flex-row items-center justify-between group hover:bg-white/2 transition-colors"
                  >
                    <div className="flex flex-col space-y-1 sm:space-y-2">
                      <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                        Keyword {i + 1}
                      </span>
                      <p className="text-base sm:text-lg font-serif text-white tracking-tight">
                        {kw}
                      </p>
                    </div>
                    <div className="flex items-center justify-center opacity-50 group-hover:opacity-90 transition-opacity pl-2 sm:pl-4">
                      {KeywordIcon ? (
                        <KeywordIcon
                          className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10"
                          style={{ color: styles.primary }}
                        />
                      ) : (
                        <TbSparkles className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Essence / Motivation */}
            <div className="p-8 border border-white/10 bg-black/50 space-y-6 rounded-md">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Icon
                  className="w-5 h-5 opacity-40"
                  style={{ color: styles.primary }}
                />
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
                  Core Motivation
                </h3>
              </div>
              <p className="text-[17px] text-white/80 leading-relaxed font-serif">
                {learnData.motivation}
              </p>
            </div>
          </div>

          {/* Right Column: Element Frame Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-7 relative h-full min-h-[500px] flex flex-col items-center justify-center lg:sticky lg:top-32 -translate-y-12"
          >
            <div className="relative w-full max-w-[560px] lg:max-w-[700px]">
              <img
                src={ui.frameUrl}
                alt={`${elementType} Element`}
                className="w-full opacity-95 hover:scale-[1.05] transition-transform duration-700 ease-out"
                style={{ filter: `drop-shadow(0 0 15px ${styles.glow})` }}
              />
            </div>

            {/* Sign Icons Row */}
            <div className="relative w-full max-w-[560px] lg:max-w-[700px] flex items-center justify-between mt-4 px-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                FIG.{" "}
                {["Fire", "Earth", "Air", "Water"].indexOf(elementType) + 1} //{" "}
                {elementType.toUpperCase()}
              </span>
              <div className="flex items-center gap-4 md:gap-6">
                {signModes.map(({ sign }) => {
                  const signUi = zodiacUIConfig[sign];
                  if (!signUi) return null;
                  const SignIcon = signUi.icon;
                  return (
                    <div
                      key={sign}
                      className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm"
                      style={{ boxShadow: `0 0 12px ${styles.glow}` }}
                    >
                      <SignIcon
                        className="w-5 h-5 md:w-6 md:h-6"
                        style={{
                          color: styles.primary,
                          filter: `drop-shadow(0 0 6px ${styles.glow})`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Elemental Blueprint ─────────────────────────────── */}
        <ElementalBlueprint
          elementType={elementType}
          learnData={learnData}
          contentData={contentData}
          signModes={signModes}
          styles={styles}
          ui={ui}
        />

        {/* Footer Linkages */}
        <SystemArchiveLinkages category="elements" currentId={elementType} />
      </div>
    </div>
  );
}
