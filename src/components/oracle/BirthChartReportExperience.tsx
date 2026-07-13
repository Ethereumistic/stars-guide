"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Compass, Eye, Gift, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { useOracleStore } from "@/store/use-oracle-store";
import type { StoredBirthData } from "@/lib/birth-chart/types";
import type { BirthChartReportV3, ReportPractice } from "../../../convex/birthChartReport/v3";

const corePlanetIds = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function title(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function PlanetImage({ id, size = 64 }: { id: string; size?: number }) {
  const planet = planetUIConfig[id];
  if (!planet?.imageUrl) return <span className="font-serif text-2xl text-white/70">{planet?.rulerSymbol ?? "•"}</span>;
  return (
    <img
      src={planet.imageUrl}
      alt={title(id)}
      draggable={false}
      className="select-none object-contain"
      style={{ width: size * (planet.imageScale ?? 1), height: size * (planet.imageScale ?? 1), filter: `drop-shadow(0 0 ${Math.round(size / 3)}px ${planet.themeColor})` }}
    />
  );
}

function BigThree({ report }: { report: BirthChartReportV3 }) {
  const items = [
    { label: "Core", planetId: "sun", signId: report.visualIdentity.sunSignId },
    { label: "Inner world", planetId: "moon", signId: report.visualIdentity.moonSignId },
    { label: "First impression", planetId: "rising", signId: report.visualIdentity.risingSignId },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
      {items.map((item) => {
        const sign = item.signId ? zodiacUIConfig[item.signId] : null;
        const Sign = sign?.icon;
        const planet = planetUIConfig[item.planetId];
        return (
          <div key={item.label} className="relative flex min-h-32 items-center justify-between overflow-hidden bg-[#0a0d16]/95 p-5">
            <div className="relative z-10">
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.28em] text-white/40">{item.label}</p>
              <div className="flex items-center gap-2">
                {Sign && <Sign className="size-5" style={{ color: planet?.themeColor ?? "#c4b5fd" }} />}
                <p className="font-serif text-xl text-white">{item.signId ? title(item.signId) : "Unavailable"}</p>
              </div>
            </div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-75"><PlanetImage id={item.planetId} size={72} /></div>
          </div>
        );
      })}
    </div>
  );
}

function PatternSeal({ report, birthData }: { report: BirthChartReportV3; birthData: StoredBirthData }) {
  const planets = birthData.chart?.planets.filter((planet) => corePlanetIds.includes(planet.id)) ?? [];
  const highlighted = new Set(report.chartSignature.pattern.planetIds);
  const points = planets.map((planet) => {
    const angle = (planet.longitude - 90) * Math.PI / 180;
    return { ...planet, x: 50 + Math.cos(angle) * 38, y: 50 + Math.sin(angle) * 38 };
  });
  const connected = points.filter((point) => highlighted.has(point.id));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]" aria-label={`Chart pattern diagram: ${report.chartSignature.pattern.name}`}>
      <div className="absolute inset-[8%] rounded-full border border-white/10 shadow-[inset_0_0_80px_rgba(126,106,255,0.08)]" />
      <div className="absolute inset-[20%] rounded-full border border-dashed border-white/10" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".4" />
        {connected.length >= 2 && (
          <polygon points={connected.map((point) => `${point.x},${point.y}`).join(" ")} fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.7)" strokeWidth=".65" />
        )}
        {points.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r={highlighted.has(point.id) ? 1.8 : 0.65} fill={highlighted.has(point.id) ? "#f5cf7a" : "rgba(255,255,255,.35)"} />)}
      </svg>
      <div className="absolute inset-[32%] grid place-items-center rounded-full border border-violet-300/15 bg-violet-300/[0.04] text-center">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-violet-200/50">Pattern</p>
          <p className="mt-1 font-serif text-lg leading-tight text-white">{report.chartSignature.pattern.name}</p>
        </div>
      </div>
      {connected.slice(0, 6).map((point) => (
        <div key={point.id} className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#090c14]" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <PlanetImage id={point.id} size={24} />
        </div>
      ))}
    </div>
  );
}

function Evidence({ items }: { items: BirthChartReportV3["themes"][number]["evidence"] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {items.map((item) => {
        const planetId = item.bodyIds[0];
        const planet = planetId ? planetUIConfig[planetId] : null;
        return (
          <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] leading-4 text-white/45">
            {planet?.rulerSymbol && <span style={{ color: planet.themeColor }}>{planet.rulerSymbol}</span>}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function PracticeLine({ item }: { item: ReportPractice }) {
  return (
    <div className="mt-5 border-l border-violet-300/30 pl-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-violet-200/50">Try · {item.cadence.replace("_", " ")}</p>
      <p className="mt-2 text-sm leading-6 text-white/65">{item.instruction}</p>
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
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.55 } };

  return (
    <article className="birth-chart-report overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#070a12] text-white shadow-[0_40px_120px_rgba(0,0,0,.45)]" style={{ "--report-accent": accent } as React.CSSProperties}>
      <header className="relative overflow-hidden px-6 pb-8 pt-9 sm:px-10 sm:pb-12 sm:pt-12 lg:px-14">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 10%, color-mix(in srgb, ${accent} 18%, transparent), transparent 42%), radial-gradient(circle at 5% 85%, rgba(110,212,209,.09), transparent 35%)` }} />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <div className="mb-7 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.32em] text-white/40">
              <span className="h-px w-8 bg-white/25" /> Personal chart field guide
            </div>
            <h1 className="max-w-3xl font-serif text-4xl leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">{report.meta.reportTitle}</h1>
            <p className="mt-5 max-w-2xl font-serif text-xl italic leading-8 text-white/55 sm:text-2xl">“{report.identity.anchorPhrase}”</p>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70">{report.identity.oneSentence}</p>
          </div>
          <div className="border-l border-white/10 pl-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">How to enter this chart</p>
            <p className="mt-3 text-sm leading-6 text-white/55">{report.identity.orientation}</p>
          </div>
        </div>
        <div className="relative mt-10"><BigThree report={report} /></div>
      </header>

      <motion.section {...reveal} className="border-y border-white/[0.08] bg-white/[0.018] px-6 py-12 sm:px-10 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <PatternSeal report={report} birthData={birthData} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-violet-200/65">Your chart signature</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">{report.chartSignature.pattern.rarity}</span>
            </div>
            <h2 className="mt-5 font-serif text-4xl tracking-[-0.02em] text-white">{report.chartSignature.pattern.name}</h2>
            <p className="mt-4 text-sm leading-6 text-white/45">{report.chartSignature.pattern.definition}</p>
            <p className="mt-5 text-base leading-7 text-white/75">{report.chartSignature.meaning}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.035] p-4"><p className="flex items-center gap-2 text-xs text-emerald-200/70"><Gift className="size-3.5" /> The edge</p><p className="mt-2 text-sm leading-6 text-white/60">{report.chartSignature.gift}</p></div>
              <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-4"><p className="flex items-center gap-2 text-xs text-amber-200/70"><Eye className="size-3.5" /> Notice</p><p className="mt-2 text-sm leading-6 text-white/60">{report.chartSignature.watchFor}</p></div>
            </div>
            <PracticeLine item={report.chartSignature.practice} />
          </div>
        </div>
      </motion.section>

      <section className="px-6 py-14 sm:px-10 lg:px-14">
        <div className="mb-8 max-w-xl"><p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">What repeats</p><h2 className="mt-3 font-serif text-3xl text-white">Three themes worth remembering</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {report.themes.map((theme, index) => {
            const evidencePlanet = theme.evidence.flatMap((item) => item.bodyIds)[0];
            const color = planetUIConfig[evidencePlanet]?.themeColor ?? accent;
            return (
              <motion.article key={theme.id} {...reveal} transition={reduceMotion ? undefined : { duration: .5, delay: index * .08 }} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent 75%)` }} />
                <div className="mb-7 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">Theme {index + 1}</span>{evidencePlanet && <div className="grid size-12 place-items-center"><PlanetImage id={evidencePlanet} size={42} /></div>}</div>
                <h3 className="font-serif text-2xl leading-tight text-white">{theme.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/60">{theme.summary}</p>
                <dl className="mt-6 space-y-4 border-t border-white/[0.07] pt-5 text-sm">
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-200/55">Gift</dt><dd className="mt-1.5 leading-6 text-white/55">{theme.gift}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-200/55">Watch for</dt><dd className="mt-1.5 leading-6 text-white/55">{theme.watchFor}</dd></div>
                </dl>
                <PracticeLine item={theme.practice} />
                <Evidence items={theme.evidence} />
              </motion.article>
            );
          })}
        </div>
      </section>

      <motion.section {...reveal} className="border-y border-white/[0.08] bg-[#0a0d16] px-6 py-14 sm:px-10 lg:px-14">
        <div className="mb-8 flex items-center gap-3"><Compass className="size-5 text-cyan-200/60" /><h2 className="font-serif text-3xl text-white">Your compass</h2></div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-2">
          {Object.entries(report.compass).map(([key, point]) => (
            <div key={key} className="bg-[#090c14] p-6 sm:p-8"><p className="font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-100/35">{title(key)}</p><h3 className="mt-3 font-serif text-xl text-white">{point.headline}</h3><p className="mt-3 text-sm leading-6 text-white/55">{point.summary}</p><Evidence items={point.evidence} /></div>
          ))}
        </div>
      </motion.section>

      <section className="px-6 py-14 sm:px-10 lg:px-14">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">Use the chart</p><h2 className="mt-3 font-serif text-3xl text-white">A toolkit for real life</h2><p className="mt-4 text-sm leading-6 text-white/45">Three small interventions to keep the report useful after you close it.</p></div>
          <div className="space-y-3">
            {Object.entries(report.toolkit).map(([key, item], index) => {
              const Icon = index === 0 ? ShieldAlert : index === 1 ? RotateCcw : Sparkles;
              return <div key={key} className="flex gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]"><Icon className="size-4 text-violet-200/65" /></div><div><p className="text-sm font-medium text-white/80">{item.title}</p><p className="mt-1.5 text-sm leading-6 text-white/50">{item.instruction}</p></div></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] bg-[radial-gradient(circle_at_50%_120%,rgba(126,106,255,.16),transparent_55%)] px-6 py-14 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-3xl text-center"><p className="font-mono text-[9px] uppercase tracking-[0.3em] text-violet-200/45">Continue with Oracle</p><h2 className="mt-3 font-serif text-3xl text-white">Take one thread deeper</h2></div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {report.oraclePrompts.map((item) => <button key={item.label} type="button" onClick={() => askOracle(item.prompt)} className="group flex min-h-24 items-center justify-between gap-4 rounded-xl border border-white/[0.09] bg-black/20 p-5 text-left transition-colors hover:border-violet-300/25 hover:bg-violet-300/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"><span><span className="block text-sm font-medium text-white/80">{item.label}</span><span className="mt-1.5 block text-xs leading-5 text-white/40">{item.prompt}</span></span><ArrowUpRight className="size-4 shrink-0 text-white/25 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-200/70" /></button>)}
        </div>
      </section>

      <details className="border-t border-white/[0.08] px-6 py-7 sm:px-10 lg:px-14">
        <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.25em] text-white/35 hover:text-white/60">View calculated placements</summary>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {birthData.chart?.planets.map((planet) => <div key={planet.id} className="flex items-center gap-3 bg-[#090c14] p-3"><div className="grid size-9 place-items-center"><PlanetImage id={planet.id} size={30} /></div><div><p className="text-xs font-medium text-white/70">{title(planet.id)} · {title(planet.signId)}</p><p className="mt-1 font-mono text-[9px] text-white/30">{(((planet.longitude % 30) + 30) % 30).toFixed(2)}° · House {planet.houseId}{planet.retrograde ? " · Rx" : ""}</p></div></div>)}
        </div>
      </details>
    </article>
  );
}
