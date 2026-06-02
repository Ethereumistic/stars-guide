"use client";

import * as React from "react";
import { motion } from "motion/react";
import { planetUIConfig } from "@/config/planet-ui";
import { format } from "date-fns";

/* ── Retrograde type (shared) ──────────────────────────────── */

export interface RetrogradeWindow {
  planetId: string;
  planetName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  daysLeft: number | null;
}

/* ── Retrograde Card ────────────────────────────────────────── */

export function RetrogradeCard({ retroWindow }: { retroWindow: RetrogradeWindow }) {
  const ui = planetUIConfig[retroWindow.planetId];
  const themeColor = ui?.themeColor ?? "#f97316";
  const symbol = ui?.rulerSymbol ?? "○";
  const imageScale = ui?.imageScale ?? 1;

  // Self-managed reveal — resets on every planet change
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, [retroWindow.planetId]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[64px] transition-opacity duration-700"
        style={{
          opacity: revealed ? 0.2 : 0,
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

      {/* Planet image — always visible, zooms in from 0.8→1 */}
      <div className="relative w-56 h-56 mb-7">
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-700"
          style={{
            opacity: revealed ? 0.12 : 0,
            backgroundColor: themeColor,
          }}
        />
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full h-full"
        >
          {ui?.imageUrl ? (
            <img
              src={ui.imageUrl}
              alt={retroWindow.planetName}
              className="w-full h-full object-contain transition-all duration-500"
              style={{ transform: `scale(${imageScale * 1.2})`, filter: revealed ? "brightness(1.1)" : "brightness(0.85)" }}
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-6xl border border-border/30"
              style={{ color: themeColor, transform: "scale(1.2)" }}
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
            ? `0 0 12px ${themeColor}80, 0 0 28px ${themeColor}30`
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
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
          {retroWindow.daysLeft !== null && retroWindow.daysLeft > 0
            ? `${retroWindow.daysLeft} ${retroWindow.isActive ? "days left" : "days away"}`
            : retroWindow.isActive ? "Active now" : "—"}
        </span>
        <span className="text-primary/25">·</span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-primary">
          {format(retroWindow.startDate, "MMM d")} – {format(retroWindow.endDate, "MMM d")}
        </span>
      </div>
    </div>
  );
}