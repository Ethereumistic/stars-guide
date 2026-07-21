"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  Eye,
  Gift,
  Heart,
  MoonStar,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { ArtNouveauBorder } from "@/components/ui/art-nouveau-border";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOracleStore } from "@/store/use-oracle-store";
import type { StoredBirthData } from "@/lib/birth-chart/types";
import type { ChartEvidenceItem } from "@/lib/birth-chart/report-context";
import type {
  BirthChartReportV3,
  ReportPractice,
  ReportTheme,
} from "../../../convex/birthChartReport/v3";

const corePlanetIds = [
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
];

const romanNumerals = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

const planetFallbackSymbols: Record<string, string> = {
  north_node: "☊",
  south_node: "☋",
  chiron: "⚷",
  rising: "↑",
};

const rarityColors: Record<BirthChartReportV3["chartSignature"]["pattern"]["rarity"], string> = {
  Common: "#8eb7c7",
  "Fairly common": "#87cdbd",
  Uncommon: "#bba0e8",
  Rare: "#e1bd63",
  "Very rare": "#e6a0c4",
  "Personal signature": "#a78bfa",
};

function title(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function toRoman(value?: number) {
  if (!value) return null;
  return romanNumerals[value - 1] ?? String(value);
}

function bodySymbol(id?: string) {
  if (!id) return "✦";
  return planetUIConfig[id]?.rulerSymbol ?? planetFallbackSymbols[id] ?? title(id).slice(0, 2);
}

function PlanetImage({
  id,
  size = 64,
  decorative = true,
}: {
  id: string;
  size?: number;
  decorative?: boolean;
}) {
  const planet = planetUIConfig[id];
  if (!planet?.imageUrl) {
    return (
      <span className="font-serif text-2xl text-white/70" aria-hidden={decorative}>
        {bodySymbol(id)}
      </span>
    );
  }
  return (
    <img
      src={planet.imageUrl}
      alt={decorative ? "" : title(id)}
      draggable={false}
      className="h-auto max-w-full select-none object-contain"
      style={{
        width: size * (planet.imageScale ?? 1),
        maxHeight: size * (planet.imageScale ?? 1),
        filter: `drop-shadow(0 0 ${Math.round(size / 3)}px ${planet.themeColor})`,
      }}
    />
  );
}

function SignMark({ id, className = "size-4" }: { id?: string; className?: string }) {
  const sign = id ? zodiacUIConfig[id] : null;
  const Icon = sign?.icon;
  if (!Icon) return id ? <span className="text-[10px] uppercase">{id.slice(0, 3)}</span> : null;
  return <Icon className={className} aria-hidden="true" />;
}

function CelestialMedallion({
  label,
  planetId,
  signId,
  index,
  className,
  primary = false,
}: {
  label: string;
  planetId: string;
  signId?: string;
  index: number;
  className: string;
  primary?: boolean;
}) {
  const planet = planetUIConfig[planetId];
  const color = planet?.themeColor ?? "#d8c275";

  return (
    <div className={`group absolute ${className}`} data-celestial-medallion={planetId}>
      <div
        className="relative aspect-square rounded-full border border-white/10 bg-[#080b13]/90 shadow-[0_26px_80px_rgba(0,0,0,.55)] transition-transform duration-700 group-hover:-translate-y-1"
        style={{ boxShadow: `0 30px 90px rgba(0,0,0,.58), inset 0 0 60px ${color}0d` }}
      >
        <div className="absolute inset-[5%] rounded-full border border-dashed border-white/[0.09] transition-transform duration-[1800ms] group-hover:rotate-45" />
        <div className="absolute inset-[13%] rounded-full border border-white/[0.07]" />
        <div className="absolute inset-[22%] rounded-full border border-white/[0.05]" />
        <span className="absolute left-[13%] top-[15%] font-mono text-[7px] tracking-[0.25em] text-white/25">0{index}</span>
        <span className="absolute right-[11%] top-1/2 size-1 -translate-y-1/2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
        <span className="absolute bottom-[11%] left-1/2 size-1 -translate-x-1/2 rounded-full bg-white/35" />

        <div className="absolute inset-[18%] grid place-items-center rounded-full">
          {planetId === "rising" ? (
            <div className="relative grid place-items-center text-white">
              <SignMark id={signId} className={primary ? "size-24" : "size-16 sm:size-20"} />
              <span className="absolute -right-5 -top-3 font-serif text-2xl text-white/40">↑</span>
            </div>
          ) : (
            <div className="transition-transform duration-700 group-hover:scale-105">
              <PlanetImage id={planetId} size={primary ? 154 : 108} />
            </div>
          )}
        </div>

        <div className="absolute inset-x-[10%] -bottom-5 z-30 rounded-full border border-white/10 bg-[#0b0e17]/95 px-3 py-2 text-center shadow-2xl backdrop-blur-xl" data-celestial-label={planetId}>
          <p className="font-mono text-[7px] uppercase tracking-[0.23em] text-white/35">{label}</p>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-white">
            <SignMark id={signId} className="size-3.5" />
            <span className="font-serif text-sm tracking-wide sm:text-base">{signId ? title(signId) : "Unavailable"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CelestialTrinity({ report }: { report: BirthChartReportV3 }) {
  return (
    <div className="relative mx-auto min-h-[430px] w-full max-w-[620px] sm:min-h-[520px] lg:min-h-[560px] xl:min-h-[590px]" aria-label="Your Sun, Moon, and rising sign">
      <div className="absolute left-[4%] top-[8%] size-[78%] rounded-full border border-white/[0.045]" />
      <div className="absolute left-[13%] top-[17%] size-[60%] rounded-full border border-dashed border-white/[0.055]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 520 560" aria-hidden="true">
        <path d="M90 315 C190 50 420 54 455 278 C477 416 338 510 191 440" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
        <path d="M119 368 C245 510 451 395 425 208" fill="none" stroke="rgba(216,194,117,.24)" strokeWidth=".8" strokeDasharray="2 9" />
        <circle cx="91" cy="315" r="3" fill="rgba(216,194,117,.7)" />
        <circle cx="455" cy="278" r="2" fill="rgba(255,255,255,.4)" />
      </svg>
      <div className="absolute left-[42%] top-[49%] z-30 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-100/15 bg-[#0a0d15] shadow-[0_0_50px_rgba(216,194,117,.12)]">
        <Sparkles className="size-4 text-amber-100/55" strokeWidth={1.2} />
      </div>
      <CelestialMedallion
        label="Solar essence"
        planetId="sun"
        signId={report.visualIdentity.sunSignId}
        index={1}
        primary
        className="left-[2%] top-[24%] z-20 w-[52%]"
      />
      <CelestialMedallion
        label="Lunar instinct"
        planetId="moon"
        signId={report.visualIdentity.moonSignId}
        index={2}
        className="right-[2%] top-[1%] z-30 w-[34%]"
      />
      <CelestialMedallion
        label="Rising presence"
        planetId="rising"
        signId={report.visualIdentity.risingSignId}
        index={3}
        className="bottom-[7%] right-0 z-20 w-[36%]"
      />
      <p className="absolute bottom-5 left-1 font-mono text-[7px] uppercase tracking-[0.28em] text-white/20">The celestial trinity</p>
    </div>
  );
}

function ReportHero({
  report,
  birthData,
  ownerLabel,
  accent,
}: {
  report: BirthChartReportV3;
  birthData: StoredBirthData;
  ownerLabel: string;
  accent: string;
}) {
  const location = [birthData.location.city, birthData.location.country].filter(Boolean).join(", ");

  return (
    <header className="relative p-1.5 sm:p-3 lg:p-4">
      <ArtNouveauBorder color={accent} className="overflow-hidden rounded-[1.65rem]">
        <div className="relative overflow-hidden rounded-[1.65rem] border border-white/[0.055] bg-[#080b13] px-5 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-9 lg:px-12 lg:pb-11 lg:pt-11 xl:px-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background: `radial-gradient(circle at 79% 35%, ${accent}1f, transparent 30%), radial-gradient(circle at 8% 78%, rgba(78,183,188,.1), transparent 28%), linear-gradient(115deg, rgba(255,255,255,.018), transparent 38%)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:80px_80px]" />
          <div className="pointer-events-none absolute left-[62%] top-[34%] h-[48%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
            <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.3em] text-white/38">
              <span className="h-px w-8" style={{ backgroundColor: accent }} />
              {ownerLabel}
            </div>
            <div className="flex items-center gap-4 font-mono text-[7px] uppercase tracking-[0.25em] text-white/25">
              <span>{birthData.date}</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>{location}</span>
            </div>
          </div>

          <div className="relative pt-8 sm:pt-10 lg:pt-12">
            <div className="mb-5 flex items-center gap-3 sm:mb-7">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.025] font-serif text-sm" style={{ color: accent }}>I</span>
              <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/32">The central axis of your chart</p>
            </div>
            <h1 className="w-full text-balance font-serif text-[clamp(2.75rem,5.15vw,5.75rem)] leading-[.9] tracking-[-0.045em] text-white">
              {report.identity.anchorPhrase}
            </h1>

            <div className="mt-8 grid items-center gap-3 sm:mt-10 xl:grid-cols-[minmax(17rem,.78fr)_minmax(31rem,1.22fr)] xl:gap-8">
              <div className="relative z-20 flex max-w-2xl gap-4 self-center xl:py-8">
                <span className="font-serif text-5xl leading-none text-white/12" aria-hidden="true">&ldquo;</span>
                <p className="pt-1 font-serif text-lg italic leading-8 text-white/62 sm:text-xl">{report.identity.oneSentence}</p>
              </div>
              <div className="relative z-10">
                <CelestialTrinity report={report} />
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20 backdrop-blur-xl xl:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="flex items-center gap-3 border-b border-white/[0.07] p-4 sm:gap-4 sm:p-5 sm:px-6 xl:border-b-0 xl:border-r">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.025]">
                <Compass className="size-4 text-white/45" strokeWidth={1.3} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/32">Opening note</p>
                <p className="mt-1 whitespace-nowrap font-serif text-sm leading-5 text-white/70 sm:text-[15px]">How to enter this chart</p>
              </div>
            </div>
            <p className="p-4 text-sm leading-6 text-white/52 sm:p-5 sm:px-6 xl:px-8 xl:py-6">{report.identity.orientation}</p>
          </div>

          <div className="relative mt-6 flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.28em] text-white/20">
            <span>Personal edition · 01</span>
            <span>Whole sign houses</span>
          </div>
        </div>
      </ArtNouveauBorder>
    </header>
  );
}

function PatternSeal({ report, birthData }: { report: BirthChartReportV3; birthData: StoredBirthData }) {
  const planets = birthData.chart?.planets.filter((planet) => corePlanetIds.includes(planet.id)) ?? [];
  const highlighted = new Set(report.chartSignature.pattern.planetIds);
  const points = planets.map((planet) => {
    const angle = ((planet.longitude - 90) * Math.PI) / 180;
    return { ...planet, x: 50 + Math.cos(angle) * 38, y: 50 + Math.sin(angle) * 38 };
  });
  const connected = points.filter((point) => highlighted.has(point.id));

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[370px]"
      aria-label={`Chart pattern diagram: ${report.chartSignature.pattern.name}`}
    >
      <div className="absolute inset-[2%] rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[8%] rounded-full border border-white/10 shadow-[inset_0_0_100px_rgba(126,106,255,0.09)]" />
      <div className="absolute inset-[18%] rounded-full border border-dashed border-white/10" />
      <div className="absolute inset-[27%] rounded-full border border-white/[0.06]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".4" />
        {connected.length >= 2 && (
          <polygon
            points={connected.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="color-mix(in srgb, var(--rarity-color) 10%, transparent)"
            stroke="var(--rarity-color)"
            strokeOpacity=".75"
            strokeWidth=".65"
          />
        )}
        {points.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={highlighted.has(point.id) ? 1.8 : 0.65}
            fill={highlighted.has(point.id) ? "var(--rarity-color)" : "rgba(255,255,255,.35)"}
          />
        ))}
      </svg>
      <div className="absolute inset-[33%] grid place-items-center rounded-full border border-white/10 bg-[#080b13]/90 text-center shadow-[0_0_70px_rgba(0,0,0,.7)]">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-white/35">Pattern</p>
          <p className="mt-1 font-serif text-lg leading-tight text-white">{report.chartSignature.pattern.name}</p>
        </div>
      </div>
      {connected.slice(0, 6).map((point) => (
        <div
          key={point.id}
          className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#080b13] shadow-[0_0_24px_rgba(0,0,0,.8)]"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <PlanetImage id={point.id} size={26} />
        </div>
      ))}
    </div>
  );
}

function aspectMark(item: ChartEvidenceItem) {
  const source = `${item.id} ${item.label}`.toLowerCase();
  if (source.includes("opposition")) return "☍";
  if (source.includes("conjunction")) return "☌";
  if (source.includes("trine")) return "△";
  if (source.includes("square")) return "□";
  if (source.includes("sextile")) return "⚹";
  if (source.includes("quincunx")) return "⚻";
  return "·";
}

function EvidenceFormula({ item }: { item: ChartEvidenceItem }) {
  const bodies = item.bodyIds.slice(0, 4);
  const house = toRoman(item.houseIds[0]);
  const sign = item.signIds[0];
  const planetColor = planetUIConfig[bodies[0]]?.themeColor ?? "#d8c68a";

  let formula: React.ReactNode;
  if (item.kind === "aspect") {
    formula = (
      <>
        <span style={{ color: planetColor }}>{bodySymbol(bodies[0])}</span>
        <span className="text-white/35">{aspectMark(item)}</span>
        <span style={{ color: planetUIConfig[bodies[1]]?.themeColor ?? "#c8b9e8" }}>{bodySymbol(bodies[1])}</span>
        {typeof item.orb === "number" && <span className="text-white/30">{item.orb.toFixed(1)}°</span>}
      </>
    );
  } else if (item.kind === "chart_ruler") {
    formula = (
      <>
        <SignMark id={sign} />
        <span className="text-white/25">→</span>
        <span style={{ color: planetColor }}>{bodySymbol(bodies[0])}</span>
        {house && <span className="font-serif text-white/55">H·{house}</span>}
      </>
    );
  } else if (item.kind === "nodal_axis") {
    formula = (
      <>
        <span className="text-violet-200/75">☊</span>
        <span className="font-serif text-white/55">{toRoman(item.houseIds[0])}</span>
        <span className="text-white/25">↔</span>
        <span className="text-violet-200/55">☋</span>
        <span className="font-serif text-white/55">{toRoman(item.houseIds[1])}</span>
      </>
    );
  } else {
    formula = (
      <>
        {bodies.map((bodyId) => (
          <span key={bodyId} style={{ color: planetUIConfig[bodyId]?.themeColor ?? "#d8c68a" }}>
            {bodySymbol(bodyId)}
          </span>
        ))}
        {item.bodyIds.length > bodies.length && <span className="text-white/35">+{item.bodyIds.length - bodies.length}</span>}
        {sign && <SignMark id={sign} />}
        {house && <span className="font-serif text-white/55">H·{house}</span>}
        {item.kind === "dignity" && <span className="text-amber-200/60">✦</span>}
      </>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={item.label}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] text-white/55 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
        >
          {formula}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-72 border border-white/10 bg-[#111522] px-3 py-2 text-[11px] leading-5 text-white shadow-2xl"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function Evidence({ items, className = "" }: { items: ChartEvidenceItem[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => (
        <EvidenceFormula key={item.id} item={item} />
      ))}
    </div>
  );
}

function PracticeLine({ item, compact = false }: { item: ReportPractice; compact?: boolean }) {
  return (
    <div className={compact ? "border-l border-violet-300/30 pl-4" : "mt-5 border-l border-violet-300/30 pl-4"}>
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-violet-200/50">
        Try · {item.cadence.replace("_", " ")}
      </p>
      <p className={compact ? "mt-2 text-[13px] leading-5 text-white/65" : "mt-2 text-sm leading-6 text-white/65"}>{item.instruction}</p>
    </div>
  );
}

function handleFlipKey(event: KeyboardEvent<HTMLDivElement>, flip: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flip();
  }
}

function FlipHint({ flipped }: { flipped: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
      {flipped ? "Return to front" : "Turn card"}
      <RotateCcw className="size-3" aria-hidden="true" />
    </span>
  );
}

function SignatureCard({ report, birthData }: { report: BirthChartReportV3; birthData: StoredBirthData }) {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();
  const rarityColor = rarityColors[report.chartSignature.pattern.rarity];
  const flip = () => setFlipped((value) => !value);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${flipped ? "Show visual" : "Read interpretation"} for ${report.chartSignature.pattern.name}`}
      onClick={flip}
      onKeyDown={(event) => handleFlipKey(event, flip)}
      className="group h-[720px] cursor-pointer focus-visible:outline-none sm:h-[640px] lg:h-[570px]"
      style={{ perspective: "1800px", "--rarity-color": rarityColor } as CSSProperties}
    >
      <motion.div
        className="relative size-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.72, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`absolute inset-0 ${flipped ? "pointer-events-none" : ""}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <ArtNouveauBorder color={rarityColor} className="h-full overflow-hidden rounded-[1.75rem]">
            <div className="relative grid size-full items-center overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#090c15] p-7 sm:p-10 lg:grid-cols-[.92fr_1.08fr] lg:p-12">
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: `radial-gradient(circle at 24% 50%, ${rarityColor}18, transparent 34%), radial-gradient(circle at 88% 0%, ${rarityColor}10, transparent 30%)` }}
              />
              <div className="relative">
                <PatternSeal report={report} birthData={birthData} />
              </div>
              <div className="relative mt-5 lg:mt-0 lg:pl-10">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.23em]"
                    style={{ borderColor: `${rarityColor}55`, color: rarityColor, backgroundColor: `${rarityColor}12` }}
                  >
                    Your chart signature
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                    {report.chartSignature.pattern.rarity}
                  </span>
                </div>
                <h2 className="mt-6 max-w-lg font-serif text-4xl leading-[1.02] tracking-[-0.02em] text-white sm:text-5xl">
                  {report.chartSignature.pattern.name}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-white/52">{report.chartSignature.pattern.definition}</p>
                <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
                  <div className="flex -space-x-1">
                    {report.chartSignature.pattern.planetIds.slice(0, 5).map((planetId) => (
                      <span
                        key={planetId}
                        className="grid size-8 place-items-center rounded-full border border-white/10 bg-[#0d111c] font-serif text-sm"
                        style={{ color: planetUIConfig[planetId]?.themeColor ?? rarityColor }}
                      >
                        {bodySymbol(planetId)}
                      </span>
                    ))}
                  </div>
                  <FlipHint flipped={false} />
                </div>
              </div>
            </div>
          </ArtNouveauBorder>
        </div>

        <div
          className={`absolute inset-0 ${!flipped ? "pointer-events-none" : ""}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <ArtNouveauBorder color={rarityColor} className="h-full overflow-hidden rounded-[1.75rem]">
            <div className="relative size-full overflow-y-auto rounded-[1.75rem] border border-white/[0.06] bg-[#090c15] p-7 sm:p-10 lg:p-12">
              <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 100% 0%, ${rarityColor}18, transparent 36%)` }} />
              <div className="relative grid min-h-full content-center gap-8 lg:grid-cols-[.78fr_1.22fr] lg:gap-12">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.27em]" style={{ color: rarityColor }}>
                    The pattern in your life
                  </p>
                  <h2 className="mt-4 font-serif text-3xl text-white">{report.chartSignature.pattern.name}</h2>
                  <p className="mt-5 text-base leading-7 text-white/72">{report.chartSignature.meaning}</p>
                  <div className="mt-7"><FlipHint flipped /></div>
                </div>
                <div className="grid content-center gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
                    <p className="flex items-center gap-2 text-xs text-emerald-200/70"><Gift className="size-3.5" /> The gift</p>
                    <p className="mt-3 text-sm leading-6 text-white/62">{report.chartSignature.gift}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.035] p-5">
                    <p className="flex items-center gap-2 text-xs text-amber-200/70"><Eye className="size-3.5" /> The shadow</p>
                    <p className="mt-3 text-sm leading-6 text-white/62">{report.chartSignature.watchFor}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.035] p-5 sm:col-span-2">
                    <PracticeLine item={report.chartSignature.practice} compact />
                  </div>
                </div>
              </div>
            </div>
          </ArtNouveauBorder>
        </div>
      </motion.div>
    </div>
  );
}

function ThemeCard({ theme, index, accent }: { theme: ReportTheme; index: number; accent: string }) {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();
  const evidencePlanet = theme.evidence.flatMap((item) => item.bodyIds)[0];
  const color = planetUIConfig[evidencePlanet]?.themeColor ?? accent;
  const flip = () => setFlipped((value) => !value);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${flipped ? "Show summary" : "Reveal gift, shadow, and practice"}: ${theme.title}`}
      onClick={flip}
      onKeyDown={(event) => handleFlipKey(event, flip)}
      className="group h-[680px] cursor-pointer focus-visible:outline-none sm:h-[660px] lg:h-[700px] xl:h-[680px]"
      style={{ perspective: "1500px" }}
    >
      <motion.div
        className="relative size-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={`absolute inset-0 ${flipped ? "pointer-events-none" : ""}`} style={{ backfaceVisibility: "hidden" }}>
          <ArtNouveauBorder color={color} animateOnHover className="h-full overflow-hidden rounded-2xl">
            <article className="relative flex size-full flex-col overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a0d16] p-6 sm:p-7">
              <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 78% 18%, ${color}18, transparent 31%)` }} />
              <div className="relative flex items-start justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.27em] text-white/32">Theme 0{index + 1}</span>
                <div className="grid size-20 place-items-center transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
                  {evidencePlanet ? <PlanetImage id={evidencePlanet} size={64} /> : <Sparkles className="size-7" style={{ color }} />}
                </div>
              </div>
              <div className="relative mt-auto">
                <h3 className="max-w-[15ch] font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-white">{theme.title}</h3>
                <p className="mt-5 text-sm leading-6 text-white/55">{theme.summary}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-5">
                  <div className="flex items-center gap-3 text-[10px] text-white/38">
                    <span className="inline-flex items-center gap-1.5"><Gift className="size-3 text-emerald-200/60" /> Gift</span>
                    <span className="inline-flex items-center gap-1.5"><Eye className="size-3 text-amber-200/60" /> Shadow</span>
                  </div>
                  <FlipHint flipped={false} />
                </div>
              </div>
            </article>
          </ArtNouveauBorder>
        </div>

        <div className={`absolute inset-0 ${!flipped ? "pointer-events-none" : ""}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <article className="relative size-full overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0c101a] p-5 shadow-[inset_0_0_50px_rgba(255,255,255,.015)] sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent 80%)` }} />
            <div className="relative flex min-h-full flex-col">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color }}>{theme.title}</p>
                <FlipHint flipped />
              </div>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-200/60"><Gift className="size-3.5" /> Your gift</p>
                  <p className="mt-2 text-[13px] leading-5 text-white/66">{theme.gift}</p>
                </div>
                <div className="border-t border-white/[0.07] pt-5">
                  <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-200/60"><Eye className="size-3.5" /> Watch for</p>
                  <p className="mt-2 text-[13px] leading-5 text-white/66">{theme.watchFor}</p>
                </div>
                <div className="rounded-xl border border-violet-300/10 bg-violet-300/[0.035] p-4">
                  <PracticeLine item={theme.practice} compact />
                </div>
              </div>
              <Evidence items={theme.evidence} className="mt-auto pt-6" />
            </div>
          </article>
        </div>
      </motion.div>
    </div>
  );
}

function CompassRose() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/10 bg-[#090c14] shadow-[0_0_80px_rgba(72,181,190,.12)] md:grid">
      <div className="absolute inset-3 rotate-45 border border-dashed border-cyan-100/10" />
      <Compass className="size-7 text-cyan-100/45" strokeWidth={1.2} />
    </div>
  );
}

export function BirthChartReportExperience({ report, birthData }: { report: BirthChartReportV3; birthData: StoredBirthData }) {
  const router = useRouter();
  const setPendingQuestion = useOracleStore((state) => state.setPendingQuestion);
  const reduceMotion = useReducedMotion();
  const askOracle = (prompt: string) => {
    setPendingQuestion(prompt);
    router.push("/oracle/new");
  };
  const accent = planetUIConfig[report.visualIdentity.accentPlanetId]?.themeColor ?? "#a78bfa";
  const ownerLabel = report.meta.preferredName.toLowerCase() === "seeker"
    ? "Your private birth chart"
    : `${report.meta.preferredName} · private birth chart`;
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.55 },
      };
  const compassEntries = Object.entries(report.compass) as Array<[
    keyof BirthChartReportV3["compass"],
    BirthChartReportV3["compass"][keyof BirthChartReportV3["compass"]],
  ]>;
  const compassIcons = {
    innerWorld: MoonStar,
    relationships: Heart,
    vocation: BriefcaseBusiness,
    growth: TrendingUp,
  };

  return (
    <TooltipProvider delayDuration={180}>
      <article
        className="birth-chart-report overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#070a12] text-white shadow-[0_40px_120px_rgba(0,0,0,.45)]"
        style={{ "--report-accent": accent } as CSSProperties}
      >
        <ReportHero report={report} birthData={birthData} ownerLabel={ownerLabel} accent={accent} />

        <motion.section {...reveal} className="border-y border-white/[0.08] bg-white/[0.012] px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">The singular pattern</p>
              <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">The mark that makes this chart yours</h2>
            </div>
          </div>
          <SignatureCard report={report} birthData={birthData} />
        </motion.section>

        <section className="px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="mb-9 max-w-2xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">What repeats</p>
            <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Three themes worth remembering</h2>
            <p className="mt-4 text-sm leading-6 text-white/42">The front is the signal. Turn each card when you want the gift, shadow, and practical response.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {report.themes.map((theme, index) => (
              <motion.div
                key={theme.id}
                {...reveal}
                transition={reduceMotion ? undefined : { duration: 0.5, delay: index * 0.08 }}
              >
                <ThemeCard theme={theme} index={index} accent={accent} />
              </motion.div>
            ))}
          </div>
        </section>

        <motion.section {...reveal} className="border-y border-white/[0.08] bg-[#090c14] px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="mb-10 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-100/35">Four bearings</p>
            <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Your inner compass</h2>
          </div>
          <div className="relative grid gap-px overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.08] md:grid-cols-2">
            <CompassRose />
            {compassEntries.map(([key, point], index) => {
              const Icon = compassIcons[key];
              return (
                <div key={key} className="group relative min-h-64 overflow-hidden bg-[#090c14] p-7 sm:p-9">
                  <span className="absolute right-7 top-5 font-serif text-5xl text-white/[0.025]">0{index + 1}</span>
                  <Icon className="size-5 text-cyan-100/45" strokeWidth={1.4} />
                  <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-100/35">{title(key)}</p>
                  <h3 className="mt-3 max-w-md font-serif text-2xl leading-tight text-white">{point.headline}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">{point.summary}</p>
                  <Evidence items={point.evidence} className="mt-5" />
                </div>
              );
            })}
          </div>
        </motion.section>

        <section className="px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">Use the chart</p>
              <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">A toolkit for real life</h2>
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/45">Three small interventions, arranged as a sequence you can return to after the report closes.</p>
            </div>
            <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[1.55rem] before:top-8 before:w-px before:bg-gradient-to-b before:from-violet-300/0 before:via-violet-300/20 before:to-violet-300/0">
              {Object.entries(report.toolkit).map(([key, item], index) => {
                const Icon = index === 0 ? ShieldAlert : index === 1 ? RotateCcw : Sparkles;
                return (
                  <motion.div
                    key={key}
                    {...reveal}
                    className="group relative flex gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.022] p-5 transition-colors hover:border-violet-300/15 hover:bg-violet-300/[0.025] sm:p-6"
                  >
                    <div className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-violet-200/15 bg-[#0b0e18] shadow-[0_0_24px_rgba(126,106,255,.12)]">
                      <Icon className="size-4 text-violet-200/65" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-serif text-lg text-white/85">{item.title}</p>
                        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">{item.cadence.replace("_", " ")}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/52">{item.instruction}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] bg-[radial-gradient(circle_at_50%_120%,rgba(126,106,255,.18),transparent_56%)] px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-violet-200/45">Continue with Oracle</p>
            <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Take one thread deeper</h2>
            <p className="mt-4 text-sm text-white/40">Choose the doorway. Oracle carries the exact chart context into the conversation.</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.08] sm:grid-cols-2">
            {report.oraclePrompts.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => askOracle(item.prompt)}
                className="group relative flex min-h-36 items-center justify-between gap-5 bg-[#090c14] p-6 text-left transition-colors hover:bg-violet-300/[0.045] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
              >
                <span className="absolute right-5 top-4 font-mono text-[8px] tracking-[0.22em] text-white/20">0{index + 1}</span>
                <span>
                  <span className="block font-serif text-lg text-white/85">{item.label}</span>
                  <span className="mt-2 block text-xs leading-5 text-white/42">{item.prompt}</span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 transition group-hover:border-violet-200/25 group-hover:bg-violet-200/[0.05]">
                  <ArrowUpRight className="size-4 text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-200/75" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <details className="group border-t border-white/[0.08] px-6 py-7 sm:px-10 lg:px-14">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-white/35 hover:text-white/60">
            View calculated placements
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
            {birthData.chart?.ascendant && (
              <div className="flex items-center gap-3 bg-[#090c14] p-3">
                <div className="relative grid size-9 place-items-center rounded-full border border-white/[0.07] bg-white/[0.025] text-white/70">
                  <SignMark id={birthData.chart.ascendant.signId} className="size-5" />
                  <span className="absolute -right-0.5 -top-1 font-serif text-xs text-white/40">↑</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/70">Ascendant · {title(birthData.chart.ascendant.signId)}</p>
                  <p className="mt-1 font-mono text-[9px] text-white/30">
                    {(((birthData.chart.ascendant.longitude % 30) + 30) % 30).toFixed(2)}° · House I
                  </p>
                </div>
              </div>
            )}
            {birthData.chart?.planets.map((planet) => (
              <div key={planet.id} className="flex items-center gap-3 bg-[#090c14] p-3">
                <div className="grid size-9 place-items-center"><PlanetImage id={planet.id} size={30} /></div>
                <div>
                  <p className="text-xs font-medium text-white/70">{title(planet.id)} · {title(planet.signId)}</p>
                  <p className="mt-1 font-mono text-[9px] text-white/30">
                    {(((planet.longitude % 30) + 30) % 30).toFixed(2)}° · House {toRoman(planet.houseId)}{planet.retrograde ? " · Rx" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      </article>
    </TooltipProvider>
  );
}
