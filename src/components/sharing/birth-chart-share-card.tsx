"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { compositionalSigns } from "@/astrology/signs";

interface BirthChartShareCardProps {
  username: string;
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

const SIGN_SYMBOLS: Record<string, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

function StarsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0A0A1A" }}>
      {Array.from({ length: 80 }).map((_, i) => {
        const seed = i * 137.508;
        const x = ((seed * 9302791) % 1080) / 1080 * 100;
        const y = ((seed * 8379571) % 1920) / 1920 * 100;
        const size = ((seed * 997) % 3) + 1;
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

function PlacementRow({ symbol, body, sign }: { symbol: string; body: string; sign: string }) {
  const signData = compositionalSigns.find(s => s.name === sign);
  const ui = signData ? zodiacUIConfig[signData.id] : null;
  const elementUi = signData ? elementUIConfig[signData.element] : null;
  
  return (
    <div className="flex items-center justify-between px-8 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl text-white/70" style={{ fontFamily: "serif" }}>{symbol}</span>
        <span className="text-sm font-medium uppercase tracking-widest text-white/40">{body}</span>
      </div>
      <div className="flex items-center gap-2">
        {elementUi && (
          <span className="text-sm" style={{ color: elementUi.styles.primary }}>{SIGN_SYMBOLS[signData?.id ?? ""] ?? "✨"}</span>
        )}
        <span className="text-base font-serif text-white">{sign}</span>
      </div>
    </div>
  );
}

export function BirthChartShareCard({ username, sunSign, moonSign, risingSign }: BirthChartShareCardProps) {
  const sunSignData = compositionalSigns.find(s => s.name === sunSign);
  const sunUI = sunSignData ? zodiacUIConfig[sunSignData.id] : null;
  const sunElementUI = sunSignData ? elementUIConfig[sunSignData.element] : null;
  const SunIcon = sunUI?.icon;

  const glowColor = sunElementUI?.styles?.glow ?? "#D4AF37";

  return (
    <div
      className="relative w-[1080px] h-[1080px] overflow-hidden"
      style={{ background: "#0A0A1A", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <StarsBackground />

      {/* Top gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${glowColor}, #D4AF37)` }}
      />

      {/* Radial glow behind sign icon */}
      <div
        className="absolute top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl"
        style={{ background: glowColor, opacity: 0.12 }}
      />

      {/* Header section */}
      <div className="relative z-10 flex flex-col items-center pt-20 pb-6">
        <div className="text-[11px] uppercase tracking-[0.35em] text-white/30 mb-3">
          YOUR COSMIC BLUEPRINT
        </div>

        {/* Sign icon */}
        {SunIcon && (
          <div className="mb-4 opacity-80">
            <SunIcon className="w-20 h-20" style={{ color: glowColor, filter: `drop-shadow(0 0 20px ${glowColor})` }} />
          </div>
        )}

        <div className="text-5xl font-serif text-white mb-2" style={{ letterSpacing: "0.05em" }}>
          {sunSign}
        </div>

        <div className="text-base text-white/50 italic font-serif">
          {sunSignData?.archetypeName ?? ""}
        </div>
      </div>

      {/* Separator */}
      <div
        className="mx-20 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${glowColor}30, transparent)` }}
      />

      {/* Username + Big Three */}
      <div className="relative z-10 flex flex-col items-center py-8">
        <div className="text-xl text-white/70 font-medium mb-8">
          @{username}
        </div>

        <div className="w-full max-w-[700px] rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <PlacementRow symbol="☉" body="Sun" sign={sunSign} />
          <div className="h-px mx-8" style={{ background: `${glowColor}15` }} />
          <PlacementRow symbol="☽" body="Moon" sign={moonSign} />
          <div className="h-px mx-8" style={{ background: `${glowColor}15` }} />
          <PlacementRow symbol="↑" body="Ascendant" sign={risingSign} />
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
        <div
          className="text-[13px] uppercase tracking-[0.3em] text-white/40"
          style={{ color: glowColor }}
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