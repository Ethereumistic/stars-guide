"use client";

import { compositionalSigns } from "@/astrology/signs";
import {
  ELEMENTS_LEARN,
  ELEMENT_CONTENT,
  ELEMENTAL_MANIFESTATIONS,
  ElementType,
  ModeType,
} from "@/astrology/elements";
import { elementUIConfig } from "@/config/elements-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import {
  TbSparkles,
  TbTargetArrow,
  TbLockSquare,
  TbArrowsExchange,
} from "react-icons/tb";
import { GiMightyForce, GiBrokenShield, GiSeedling } from "react-icons/gi";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";

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
              {contentData.keywords.map((kw, i) => (
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
                  <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-2 sm:pl-4">
                    <TbSparkles className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                  </div>
                </div>
              ))}
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
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-48"
        >
          <div className="mb-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-4">
              Elemental Blueprint
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight">
              The Nature of {elementType}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="border border-white/10 bg-black/50 rounded-md p-8 md:p-10 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-[0.06] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 100% 0%, ${styles.primary}, transparent 70%)`,
                }}
              />
              <div className="flex items-center gap-3 border-b border-white/10 pb-5 mb-6">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10"
                  style={{ backgroundColor: `${styles.primary}15` }}
                >
                  <GiMightyForce
                    className="w-4 h-4"
                    style={{ color: styles.primary }}
                  />
                </div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                  Strengths
                </h3>
              </div>
              <ul className="space-y-4">
                {learnData.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-white/85 leading-relaxed"
                  >
                    <span
                      className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: styles.primary,
                        boxShadow: `0 0 6px ${styles.glow}`,
                      }}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Struggles */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="border border-white/10 bg-black/50 rounded-md p-8 md:p-10 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 100% 0%, rgba(255,255,255,0.3), transparent 70%)`,
                }}
              />
              <div className="flex items-center gap-3 border-b border-white/10 pb-5 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5">
                  <GiBrokenShield className="w-4 h-4 text-white/40" />
                </div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                  Struggles
                </h3>
              </div>
              <ul className="space-y-4">
                {learnData.struggles.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-white/85 leading-relaxed"
                  >
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Growth Path */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="border border-white/10 bg-black/50 rounded-md p-8 md:p-10 relative overflow-hidden"
          >
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-24 opacity-[0.06] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${styles.primary}, transparent 70%)`,
              }}
            />
            <div className="flex items-center gap-3 border-b border-white/10 pb-5 mb-6">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10"
                style={{ backgroundColor: `${styles.primary}15` }}
              >
                <GiSeedling
                  className="w-4 h-4"
                  style={{ color: styles.primary }}
                />
              </div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                Growth Path
              </h3>
            </div>
            <p className="text-[17px] text-white/75 leading-relaxed font-serif max-w-3xl">
              {learnData.growth}
            </p>
          </motion.div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-2 mt-8">
            {contentData.keywords.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/40 rounded-sm"
              >
                {kw}
              </span>
            ))}
          </div>
        </motion.section>

        {/* Footer Linkages */}
        <SystemArchiveLinkages
          category="signs"
          currentId={signEntries[0]?.sign || "aries"}
        />
      </div>
    </div>
  );
}
