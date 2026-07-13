"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TbArrowRight, TbTelescope } from "react-icons/tb";

import { compositionalSigns } from "@/astrology/signs";
import { planetUIConfig, type PlanetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import {
  getPlanetTelemetry,
  type PlanetTelemetry,
} from "@/lib/planets/telemetry";

const PLANET_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

const ORBIT_CONFIG: Record<string, { radius: number; size: number }> = {
  mercury: { radius: 13.5, size: 38 },
  venus: { radius: 18, size: 42 },
  moon: { radius: 22.5, size: 40 },
  mars: { radius: 27, size: 42 },
  jupiter: { radius: 31.5, size: 54 },
  saturn: { radius: 36, size: 52 },
  uranus: { radius: 40, size: 46 },
  neptune: { radius: 43.5, size: 46 },
  pluto: { radius: 46, size: 35 },
};

const STAR_FIELD = [
  [8, 19, 1], [14, 72, 2], [19, 42, 1], [25, 87, 1], [31, 12, 2],
  [36, 64, 1], [43, 29, 1], [49, 78, 2], [55, 8, 1], [61, 92, 1],
  [67, 36, 1], [73, 69, 2], [80, 17, 1], [86, 52, 1], [92, 82, 2],
  [10, 91, 1], [22, 56, 1], [40, 94, 1], [58, 47, 1], [77, 95, 1],
] as const;

interface PlanetRadarEntry {
  id: string;
  name: string;
  telemetry: PlanetTelemetry;
  ui: PlanetUIConfig;
  signName: string;
}

function longitudeToOffset(longitude: number, radius: number) {
  const radians = (longitude * Math.PI) / 180;

  return {
    left: `${50 - Math.sin(radians) * radius}%`,
    top: `${50 - Math.cos(radians) * radius}%`,
  };
}

function formatDistance(distanceAu: number | null) {
  if (distanceAu === null) return "Geocentric position";
  if (distanceAu < 0.01) return `${Math.round(distanceAu * 149_597_870.7).toLocaleString()} km away`;
  return `${distanceAu.toFixed(2)} AU away`;
}

function PlanetImage({
  entry,
  size,
  priority = false,
}: {
  entry: PlanetRadarEntry;
  size: number;
  priority?: boolean;
}) {
  if (!entry.ui.imageUrl) {
    return (
      <span className="font-serif text-xl" style={{ color: entry.ui.themeColor }}>
        {entry.ui.rulerSymbol}
      </span>
    );
  }

  return (
    <Image
      src={entry.ui.imageUrl}
      alt=""
      width={size}
      height={size}
      priority={priority}
      className="h-full w-full object-contain"
    />
  );
}

export function LiveSkyRadar() {
  const [entries, setEntries] = useState<PlanetRadarEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("sun");
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    const nextEntries = PLANET_IDS.flatMap((id) => {
      const telemetry = getPlanetTelemetry(id, now);
      const ui = planetUIConfig[id];
      if (!telemetry || !ui) return [];

      const sign = compositionalSigns.find((item) => item.id === telemetry.signId);
      return [{
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        telemetry,
        ui,
        signName: sign?.name ?? telemetry.signId,
      }];
    });

    setEntries(nextEntries);
    setCapturedAt(now);
  }, []);

  const sun = useMemo(() => entries.find((entry) => entry.id === "sun"), [entries]);
  const orbitingPlanets = useMemo(
    () => entries.filter((entry) => entry.id !== "sun"),
    [entries],
  );
  const retrogradePlanets = useMemo(
    () => entries.filter((entry) => entry.telemetry.retrograde),
    [entries],
  );
  const activeEntry = entries.find((entry) => entry.id === activeId) ?? sun;
  const ActiveSignIcon = activeEntry
    ? zodiacUIConfig[activeEntry.telemetry.signId]?.icon
    : null;

  return (
    <section className="relative isolate w-full" aria-labelledby="live-sky-heading">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[85%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(202,166,87,0.08),transparent_67%)] blur-3xl" />

      <header className="mx-auto mb-8 flex max-w-6xl flex-col gap-5 sm:mb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="relative grid size-2.5 place-items-center">
              <span className="absolute size-full animate-ping rounded-full bg-emerald-300/60 motion-reduce:animate-none" />
              <span className="relative size-1.5 rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(167,243,208,0.9)]" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.34em] text-emerald-100/60 sm:text-[10px]">
              Sky feed · live now
            </span>
          </div>
          <h2
            id="live-sky-heading"
            className="max-w-xl font-serif text-[clamp(2.45rem,6vw,5.25rem)] leading-[0.88] tracking-[-0.045em] text-white"
          >
            The sky, <span className="italic text-primary">right now.</span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/45 sm:text-base">
            A live geocentric map of every planet moving through the zodiac.
            Touch any world to read its current cosmic coordinates.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start border-l border-white/10 pl-4 md:self-end">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">Calculated</p>
            <p className="mt-1 font-serif text-sm text-white/70">
              {capturedAt
                ? capturedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
                : "Reading the sky…"}
            </p>
          </div>
        </div>
      </header>

      <div className="relative mx-auto hidden max-w-6xl overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#070707] shadow-[0_40px_120px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.035)] md:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(212,175,55,0.08),transparent_28%),radial-gradient(circle_at_88%_88%,rgba(93,129,180,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_180%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.8%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.7%22/%3E%3C/svg%3E')]" />

        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="relative flex min-h-[26rem] items-center justify-center overflow-hidden px-3 py-8 sm:min-h-[38rem] sm:p-8 lg:min-h-[47rem] lg:border-r lg:border-white/[0.07] xl:min-h-[52rem]">
            <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.22em] text-white/20 sm:left-8 sm:top-8 sm:text-[9px]">
              <span>Geocentric ecliptic</span>
              <span className="h-px w-8 bg-white/10" />
              <span>360°</span>
            </div>

            {STAR_FIELD.map(([left, top, size], index) => (
              <i
                key={`${left}-${top}`}
                className="pointer-events-none absolute rounded-full bg-white"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  opacity: index % 3 === 0 ? 0.34 : 0.16,
                }}
              />
            ))}

            <div className="sky-wheel relative aspect-square w-full max-w-[44rem] select-none">
              <div className="absolute inset-[1.5%] rounded-full border border-primary/20 shadow-[0_0_80px_rgba(212,175,55,0.04),inset_0_0_70px_rgba(255,255,255,0.018)]" />
              <div className="absolute inset-[3.2%] rounded-full border border-dashed border-white/[0.08] motion-safe:animate-[spin_180s_linear_infinite]" />
              <div className="absolute inset-[7%] rounded-full border border-primary/[0.09]" />
              <div className="absolute inset-[10.5%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.025),transparent_64%),conic-gradient(from_0deg,rgba(212,175,55,0.025),transparent_10%,rgba(255,255,255,0.018)_20%,transparent_30%,rgba(212,175,55,0.025)_42%,transparent_52%,rgba(255,255,255,0.018)_66%,transparent_78%,rgba(212,175,55,0.025))]" />
              <div className="absolute left-1/2 top-[4%] bottom-[4%] w-px -translate-x-1/2 bg-gradient-to-b from-primary/20 via-white/[0.025] to-primary/20" />
              <div className="absolute bottom-1/2 left-[4%] right-[4%] h-px bg-gradient-to-r from-primary/20 via-white/[0.025] to-primary/20" />

              {ZODIAC_SIGNS.map((signId, index) => {
                const SignIcon = zodiacUIConfig[signId]?.icon;
                const angle = index * 30 + 15;
                const iconPosition = longitudeToOffset(angle, 47);

                return (
                  <div key={signId}>
                    <div
                      className="absolute left-1/2 top-1/2 h-[43%] w-px origin-top bg-gradient-to-b from-white/[0.035] to-white/[0.12]"
                      style={{ transform: `rotate(${-index * 30}deg)` }}
                    />
                    {SignIcon && (
                      <div
                        className="absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#090909] text-white/35 sm:size-7"
                        style={iconPosition}
                        title={signId}
                      >
                        <SignIcon className="size-3 sm:size-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.entries(ORBIT_CONFIG).map(([id, orbit]) => (
                <div
                  key={`${id}-orbit`}
                  className="absolute inset-0 rounded-full border border-white/[0.045]"
                  style={{ transform: `scale(${orbit.radius / 50})` }}
                />
              ))}

              {sun && (
                <button
                  type="button"
                  className="group absolute left-1/2 top-1/2 z-30 size-[clamp(2.5rem,12vw,6.3rem)] -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  onClick={() => setActiveId("sun")}
                  aria-label={`Sun in ${sun.signName}`}
                  aria-pressed={activeId === "sun"}
                >
                  <span className="absolute -inset-7 rounded-full bg-[radial-gradient(circle,rgba(236,195,93,0.23),transparent_68%)] blur-md transition-transform duration-700 group-hover:scale-125" />
                  <span className="absolute -inset-2 rounded-full border border-primary/20 opacity-70 motion-safe:animate-[ping_3.4s_ease-out_infinite]" />
                  <span className="relative block h-full w-full transition-transform duration-500 group-hover:scale-110">
                    <PlanetImage entry={sun} size={104} priority />
                  </span>
                </button>
              )}

              {orbitingPlanets.map((entry) => {
                const orbit = ORBIT_CONFIG[entry.id];
                if (!orbit) return null;
                const isActive = entry.id === activeId;
                const isRetrograde = entry.telemetry.retrograde;
                const position = longitudeToOffset(entry.telemetry.longitude, orbit.radius);
                const responsiveSize = `clamp(${Math.max(20, Math.round(orbit.size * 0.5))}px, ${Math.max(6, orbit.size / 6)}vw, ${orbit.size}px)`;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActiveId(entry.id)}
                    className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-[z-index] focus-visible:ring-2 focus-visible:ring-white/70"
                    style={{
                      ...position,
                      width: responsiveSize,
                      height: responsiveSize,
                      zIndex: isActive ? 40 : 20,
                    }}
                    aria-label={`${entry.name} in ${entry.signName}${isRetrograde ? ", retrograde" : ""}`}
                    aria-pressed={isActive}
                  >
                    <span
                      className="absolute -inset-2.5 rounded-full border transition-all duration-500"
                      style={{
                        borderColor: isActive ? entry.ui.themeColor : "transparent",
                        boxShadow: isActive ? `0 0 24px ${entry.ui.themeColor}` : "none",
                        opacity: isActive ? 0.42 : 0,
                      }}
                    />
                    {isRetrograde && (
                      <span className="absolute -inset-1.5 rounded-full border border-dashed border-primary/45 motion-safe:animate-[spin_9s_linear_infinite_reverse]" />
                    )}
                    <span
                      className="relative block h-full w-full transition-transform duration-500 group-hover:scale-125 group-focus-visible:scale-110"
                      style={{ filter: `drop-shadow(0 0 ${isActive ? 10 : 4}px ${entry.ui.themeColor})` }}
                    >
                      <PlanetImage entry={entry} size={orbit.size} />
                    </span>
                    {isRetrograde && (
                      <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full border border-primary/30 bg-[#0b0a08] font-serif text-[9px] text-primary shadow-[0_0_10px_rgba(212,175,55,0.16)] sm:size-5 sm:text-[10px]">
                        ℞
                      </span>
                    )}
                    <span
                      className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.16em] transition-opacity sm:text-[8px] ${
                        isActive ? "opacity-100 text-white/70" : "opacity-0 text-white/40 group-hover:opacity-100"
                      }`}
                    >
                      {entry.name}
                    </span>
                  </button>
                );
              })}

              <span className="absolute left-1/2 top-[0.2%] -translate-x-1/2 font-mono text-[7px] tracking-[0.25em] text-primary/45 sm:text-[8px]">0° ARIES</span>
              <span className="absolute bottom-[0.2%] left-1/2 -translate-x-1/2 font-mono text-[7px] tracking-[0.25em] text-white/20 sm:text-[8px]">180°</span>
            </div>
          </div>

          <aside className="relative border-t border-white/[0.07] lg:border-t-0" aria-live="polite">
            <div className="p-5 sm:p-7 lg:flex lg:h-full lg:flex-col lg:p-6 xl:p-7">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.26em] text-white/30">Selected body</span>
                <span className="font-mono text-[9px] text-white/20">LIVE / J2000</span>
              </div>

              {activeEntry ? (
                <div className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary/60">
                        {activeEntry.id === "sun" ? "The luminary" : "Current transit"}
                      </p>
                      <h3 className="font-serif text-4xl leading-none tracking-tight text-white sm:text-5xl lg:text-4xl xl:text-5xl">
                        {activeEntry.name}
                      </h3>
                    </div>
                    <div className="relative size-16 shrink-0 sm:size-20 lg:size-16 xl:size-20">
                      <div className="absolute inset-0 rounded-full blur-xl" style={{ background: activeEntry.ui.themeColor, opacity: 0.12 }} />
                      <div className="relative h-full w-full">
                        <PlanetImage entry={activeEntry} size={80} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07]">
                    <div className="bg-[#0a0a0a]/95 p-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Passing through</p>
                      <div className="mt-2 flex items-center gap-2 font-serif text-lg text-white/85">
                        {ActiveSignIcon && <ActiveSignIcon className="size-5 text-primary/75" aria-hidden="true" />}
                        <span>{activeEntry.signName}</span>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a]/95 p-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Longitude</p>
                      <p className="mt-2 font-serif text-lg tabular-nums text-white/85">
                        {activeEntry.telemetry.longitude.toFixed(2)}°
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex min-h-7 items-center gap-2">
                    {activeEntry.telemetry.retrograde ? (
                      <>
                        <span className="grid size-5 place-items-center rounded-full border border-primary/25 font-serif text-[11px] text-primary">℞</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/65">Moving retrograde</span>
                      </>
                    ) : (
                      <>
                        <span className="h-px w-5 bg-emerald-200/35" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-100/40">Direct motion</span>
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-white/30">
                    {formatDistance(activeEntry.telemetry.distanceAu)}
                  </p>
                </div>
              ) : (
                <div className="h-64 animate-pulse rounded-xl bg-white/[0.025]" />
              )}

              <div className="mt-7 lg:mt-auto lg:pt-8">
                <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.24em] text-white/20">Choose a planet</p>
                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
                  {entries.map((entry) => {
                    const isActive = activeId === entry.id;
                    return (
                      <button
                        key={`${entry.id}-selector`}
                        type="button"
                        onClick={() => setActiveId(entry.id)}
                        className={`relative grid size-12 shrink-0 snap-start place-items-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:size-14 lg:size-10 xl:size-12 ${
                          isActive
                            ? "border-primary/35 bg-primary/[0.08]"
                            : "border-white/[0.07] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                        aria-label={`Select ${entry.name}`}
                      >
                        <span className="size-8 sm:size-9 lg:size-7 xl:size-8">
                          <PlanetImage entry={entry} size={36} />
                        </span>
                        {entry.telemetry.retrograde && (
                          <span className="absolute right-0 top-0 font-serif text-[9px] text-primary">℞</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="relative flex flex-col gap-4 border-t border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            {retrogradePlanets.length > 0 ? (
              <>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/20 font-serif text-xs text-primary/80">℞</span>
                <p className="text-xs leading-relaxed text-white/35">
                  <span className="text-white/65">Retrograde now:</span>{" "}
                  {retrogradePlanets.map((planet) => planet.name).join(", ")}.
                  <span className="hidden sm:inline"> Select a marked orbit to explore the reversal.</span>
                </p>
              </>
            ) : (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">All visible planets are in direct motion</p>
            )}
          </div>
          <Link
            href="/learn/planets"
            className="group inline-flex shrink-0 items-center gap-2 self-start font-serif text-sm text-primary/75 transition-colors hover:text-primary sm:self-auto"
          >
            <TbTelescope className="size-4" aria-hidden="true" />
            <span>Explore the planets</span>
            <TbArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </footer>
      </div>

      {/* Mobile has its own composition: no oversized orbital geometry. */}
      <div className="relative min-w-0 overflow-hidden rounded-[1.4rem] border border-white/[0.09] bg-[#080807] shadow-[0_28px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] md:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.11),transparent_32%),radial-gradient(circle_at_100%_72%,rgba(92,123,169,0.07),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_180%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.8%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.7%22/%3E%3C/svg%3E')]" />

        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-200 shadow-[0_0_8px_rgba(167,243,208,0.8)]" />
            <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/35">Planet receiver</span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-primary/45">Live · 360°</span>
        </div>

        {activeEntry ? (
          <div className="relative overflow-hidden px-4 pb-5 pt-5" aria-live="polite">
            {STAR_FIELD.slice(0, 10).map(([left, top, size], index) => (
              <i
                key={`mobile-${left}-${top}`}
                className="pointer-events-none absolute rounded-full bg-white"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  opacity: index % 3 === 0 ? 0.24 : 0.1,
                }}
              />
            ))}

            <div className="relative min-h-[17rem] overflow-hidden rounded-[1.1rem] border border-white/[0.07] bg-black/25 px-4 pb-4 pt-4">
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border border-primary/[0.08]" />
              <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full border border-dashed border-white/[0.07] motion-safe:animate-[spin_70s_linear_infinite]" />
              <div className="pointer-events-none absolute -right-2 top-8 h-px w-36 -rotate-[28deg] bg-gradient-to-r from-transparent to-primary/15" />

              {ActiveSignIcon && (
                <ActiveSignIcon
                  className="pointer-events-none absolute right-3 top-3 size-20 text-primary/[0.055]"
                  aria-hidden="true"
                />
              )}

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-primary/55">
                    {activeEntry.id === "sun" ? "Central luminary" : "Current transit"}
                  </p>
                  <h3 className="mt-1 truncate font-serif text-[clamp(2.2rem,12vw,3.35rem)] leading-none tracking-[-0.035em] text-white">
                    {activeEntry.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-white/55">
                    {ActiveSignIcon && <ActiveSignIcon className="size-4 text-primary/70" aria-hidden="true" />}
                    <span className="font-serif text-sm">in {activeEntry.signName}</span>
                  </div>
                </div>

                <span className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.16em] ${
                  activeEntry.telemetry.retrograde
                    ? "border-primary/20 bg-primary/[0.06] text-primary/70"
                    : "border-emerald-200/10 bg-emerald-200/[0.025] text-emerald-100/45"
                }`}>
                  <span>{activeEntry.telemetry.retrograde ? "℞" : "→"}</span>
                  <span>{activeEntry.telemetry.retrograde ? "Retrograde" : "Direct"}</span>
                </span>
              </div>

              <div className="pointer-events-none absolute bottom-8 right-3 size-[8.5rem]">
                <div
                  className="absolute inset-4 rounded-full blur-2xl"
                  style={{ background: activeEntry.ui.themeColor, opacity: 0.18 }}
                />
                <div className="relative h-full w-full drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)]">
                  <PlanetImage entry={activeEntry} size={136} />
                </div>
              </div>

              <div className="absolute bottom-4 left-4 z-10 w-[calc(100%_-_9.5rem)] min-w-0">
                <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/25">Ecliptic longitude</p>
                <p className="mt-1 font-serif text-2xl tabular-nums text-white/80">
                  {activeEntry.telemetry.longitude.toFixed(2)}°
                </p>
                <p className="mt-1 truncate text-[9px] text-white/25">
                  {formatDistance(activeEntry.telemetry.distanceAu)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.018] px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/25">
                  Through {activeEntry.signName}
                </span>
                <span className="font-mono text-[8px] tabular-nums text-primary/55">
                  {(activeEntry.telemetry.longitude % 30).toFixed(1)}° / 30°
                </span>
              </div>
              <div className="relative mt-2.5 h-px overflow-visible bg-white/[0.08]">
                <span
                  className="absolute left-0 top-0 h-px bg-gradient-to-r from-primary/35 to-primary shadow-[0_0_8px_rgba(212,175,55,0.5)] transition-[width] duration-700"
                  style={{ width: `${((activeEntry.telemetry.longitude % 30) / 30) * 100}%` }}
                />
                <span
                  className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-[#0b0a08] shadow-[0_0_8px_rgba(212,175,55,0.45)] transition-[left] duration-700"
                  style={{ left: `${((activeEntry.telemetry.longitude % 30) / 30) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[8px] uppercase tracking-[0.23em] text-white/25">Tune to a planet</p>
                <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/15">Tap to inspect</p>
              </div>
              <div className="grid min-w-0 grid-cols-5 gap-x-1.5 gap-y-3">
                {entries.map((entry) => {
                  const isActive = entry.id === activeId;
                  return (
                    <button
                      key={`${entry.id}-mobile-selector`}
                      type="button"
                      onClick={() => setActiveId(entry.id)}
                      className="group min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      aria-label={`Select ${entry.name}`}
                      aria-pressed={isActive}
                    >
                      <span className={`relative mx-auto grid aspect-square w-full max-w-12 place-items-center rounded-xl border transition-all duration-300 ${
                        isActive
                          ? "border-primary/35 bg-primary/[0.08] shadow-[0_0_18px_rgba(212,175,55,0.08)]"
                          : "border-white/[0.065] bg-white/[0.02] group-active:scale-95"
                      }`}>
                        <span className="size-[68%]">
                          <PlanetImage entry={entry} size={34} />
                        </span>
                        {entry.telemetry.retrograde && (
                          <span className="absolute -right-0.5 -top-1 font-serif text-[9px] text-primary/80">℞</span>
                        )}
                      </span>
                      <span className={`mt-1.5 block truncate font-mono text-[6.5px] uppercase tracking-[0.06em] transition-colors ${
                        isActive ? "text-primary/70" : "text-white/25"
                      }`}>
                        {entry.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-[32rem] animate-pulse p-4">
            <div className="h-full rounded-[1.1rem] bg-white/[0.025]" />
          </div>
        )}

        <div className="relative flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
          <p className="min-w-0 text-[10px] leading-relaxed text-white/30">
            {retrogradePlanets.length > 0 ? (
              <>
                <span className="text-primary/70">℞</span>{" "}
                {retrogradePlanets.map((planet) => planet.name).join(", ")} retrograde now
              </>
            ) : (
              "Every visible planet is moving direct"
            )}
          </p>
          <Link
            href="/learn/planets"
            className="group inline-flex shrink-0 items-center gap-1.5 self-start font-serif text-xs text-primary/75 min-[380px]:self-auto"
          >
            <TbTelescope className="size-3.5" aria-hidden="true" />
            <span>Explore all</span>
            <TbArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .sky-wheel {
            animation: sky-arrival 900ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }

        @keyframes sky-arrival {
          from {
            opacity: 0;
            transform: scale(0.94) rotate(1.5deg);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0);
            filter: blur(0);
          }
        }
      `}</style>
    </section>
  );
}
