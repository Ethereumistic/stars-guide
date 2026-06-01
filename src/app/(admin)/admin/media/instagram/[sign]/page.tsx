"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export default function InstagramSignPage() {
  const params = useParams();
  const signId = params.sign as string;

  const data = compositionalSigns.find((s) => s.id === signId);
  const ui = zodiacUIConfig[signId];

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return MONTHS[now.getMonth()];
  });

  const [customText, setCustomText] = useState("");

  if (!data || !ui) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Sign not found.</p>
      </div>
    );
  }

  const Icon = ui.icon;
  const elementUi = elementUIConfig[data.element];
  const styles = elementUi.styles;

  return (
    <div className="max-w-6xl space-y-10">
      {/* Controls Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">
            Instagram — {data.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a month, paste your forecast text, and take a screenshot of the preview below.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          {/* Month Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-[0.2em] text-white/40 block">
              Forecast Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-md px-4 py-2 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m} className="bg-black text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Character Count */}
          {customText.length > 0 && (
            <div className="text-xs font-mono text-white/30">
              {customText.length} chars
            </div>
          )}
        </div>
      </div>

      {/* Instagram Preview Card — this is the screenshot target */}
      <div
        id="instagram-preview"
        className="relative w-full max-w-md mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 flex flex-col"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 100%)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${styles.primary} 0%, transparent 60%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-10 py-12">
          {/* Sign Icon in Elemental Frame */}
          <div className="relative flex items-center justify-center shrink-0 mb-6">
            <img
              src={elementUi.frameUrl}
              className="w-36 h-36 object-cover"
              alt=""
            />
            <Icon
              className="absolute w-14 h-14 stroke-1"
              style={{ color: styles.secondary }}
            />
          </div>

          {/* Sign Name */}
          <h1
            className="text-6xl font-serif text-white tracking-tighter leading-[0.85] text-center mb-3"
            style={{
              textShadow: `0 0 8px ${styles.glow}`,
            }}
          >
            {data.name}
          </h1>

          {/* Month Forecast */}
          <p
            className="text-2xl font-serif italic text-white/60 mb-6 text-center"
          >
            {selectedMonth} FORECAST
          </p>

          {/* Motto */}
          <p
            className="text-base font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1 mb-10 text-center max-w-xs"
            style={{ borderColor: styles.primary }}
          >
            &ldquo;{data.motto}&rdquo;
          </p>

          {/* Custom Forecast Text — styled like Core Essence File card */}
          <div className="w-full p-6 border border-white/10 bg-black/50 space-y-4 rounded-md">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="text-white/40 w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <path d="M20.2 20.2c2.04-2.03 2.04-5.33 0-7.37-2.03-2.04-5.33-2.04-7.37 0-2.04 2.03-2.04 5.33 0 7.37 2.04 2.04 5.33 2.04 7.37 0Z" />
                <path d="M4.2 4.2c-2.04 2.03-2.04 5.33 0 7.37 2.03 2.04 5.33 2.04 7.37 0 2.04-2.03 2.04-5.33 0-7.37-2.04-2.04-5.33-2.04-7.37 0Z" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
              </svg>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
                Forecast
              </h3>
            </div>
            {customText ? (
              <p className="text-[15px] text-white/80 leading-relaxed font-serif">
                {customText}
              </p>
            ) : (
              <p className="text-[15px] text-white/20 leading-relaxed font-serif italic">
                Paste your forecast text below…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-[0.2em] text-white/40 block">
          Custom Forecast Text
        </label>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Paste your forecast text here (~300 characters)..."
          rows={5}
          className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-3 text-sm text-white font-serif placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 resize-y"
        />
      </div>
    </div>
  );
}