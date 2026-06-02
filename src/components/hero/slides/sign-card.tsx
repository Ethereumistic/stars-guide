"use client";

import * as React from "react";
import { motion } from "motion/react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";

/* ── Placement type (shared) ───────────────────────────────── */

export interface PlacementInfo {
  label: string;
  symbol: string;
  signId: string;
}

/* ── Sign Card ──────────────────────────────────────────────── */

export function SignCard({ placement }: { placement: PlacementInfo }) {
  const signData = compositionalSigns.find((s) => s.id === placement.signId);
  const signUI = zodiacUIConfig[placement.signId];
  if (!signData || !signUI) return null;

  const elementUi = elementUIConfig[signData.element];
  const Icon = signUI.icon;
  const ElementIcon = elementUi.icon;
  const styles = elementUi.styles;

  // Self-managed reveal — resets on every sign change
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