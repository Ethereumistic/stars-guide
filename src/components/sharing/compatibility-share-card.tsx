"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";

interface CompatibilityShareCardProps {
  sign1: string;
  sign2: string;
  score?: number;       // 0-100
  label?: string;       // e.g. "Fiery Fusion"
  scoreLabel?: string;  // e.g. "85% — Fiery Fusion"
}

const SIGN_SYMBOLS: Record<string, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: "#FF6B35",
  earth: "#6B8E23",
  air: "#87CEEB",
  water: "#1E90FF",
};

function StarsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0A0A1A" }}>
      {Array.from({ length: 60 }).map((_, i) => {
        const seed = i * 137.508;
        const x = ((seed * 9302791) % 1080) / 1080 * 100;
        const y = ((seed * 8379571) % 1920) / 1920 * 100;
        const size = ((seed * 997) % 2.5) + 0.5;
        const opacity = 0.15 + ((seed * 991) % 35) / 100;
        return (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

export function CompatibilityShareCard({
  sign1,
  sign2,
  score = 75,
  label = "Cosmic Connection",
}: CompatibilityShareCardProps) {
  // Determine colors based on score
  const primaryColor = score >= 75 ? "#D4AF37" : score >= 50 ? "#87CEEB" : "#8B7355";
  const scoreColor = score >= 75 ? "#4ADE80" : score >= 50 ? "#FBBF24" : "#F87171";

  return (
    <div
      className="relative w-[1080px] h-[1080px] overflow-hidden"
      style={{ background: "#0A0A1A", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <StarsBackground />

      {/* Top gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, #D4AF37)` }}
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-20">
        <div className="text-[11px] uppercase tracking-[0.35em] text-white/30 mb-3">
          COSMIC COMPATIBILITY
        </div>

        {/* Two sign symbols side by side */}
        <div className="flex items-center gap-8 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl" style={{ color: primaryColor }}>
              {SIGN_SYMBOLS[sign1.toLowerCase()] ?? "✨"}
            </div>
            <div className="text-xl font-serif text-white">{sign1}</div>
          </div>

          <div className="text-3xl text-white/30">+</div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl" style={{ color: primaryColor }}>
              {SIGN_SYMBOLS[sign2.toLowerCase()] ?? "✨"}
            </div>
            <div className="text-xl font-serif text-white">{sign2}</div>
          </div>
        </div>

        {/* Score display */}
        <div className="mb-8 text-center">
          <div className="text-8xl font-bold mb-2" style={{ color: scoreColor }}>
            {score}%
          </div>
          <div className="text-lg font-serif text-white/60 italic">{label}</div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col items-center mt-8">
        <div
          className="px-6 py-3 rounded-full border text-sm font-medium tracking-wider"
          style={{
            borderColor: `${primaryColor}40`,
            color: primaryColor,
            background: `${primaryColor}0D`,
          }}
        >
          Check yours at stars.guide ✨
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
        <div
          className="text-[13px] uppercase tracking-[0.3em]"
          style={{ color: primaryColor }}
        >
          STARS.GUIDE
        </div>
        <div className="text-[11px] text-white/25">
          Navigate your fate
        </div>
      </div>
    </div>
  );
}