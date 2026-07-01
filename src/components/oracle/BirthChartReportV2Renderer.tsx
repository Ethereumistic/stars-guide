"use client";

import { motion } from "motion/react";
import { BirthChartReportRenderer } from "./BirthChartReportRenderer";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { aspectUIConfig } from "@/config/aspects-ui";

type EvidenceRef = {
  type: string;
  label: string;
  bodyId?: string;
  signId?: string;
  houseId?: number;
  planet1?: string;
  planet2?: string;
  orb?: number;
};

type SignatureCard = {
  id: string;
  title: string;
  emoji?: string;
  shortSummary: string;
  evidence: EvidenceRef[];
  evidenceStrength: "strong" | "moderate" | "light";
  gift: string;
  watchFor: string;
  practice: string;
};

type BirthChartReportV2 = {
  meta: { reportTitle: string; preferredName: string };
  visualIdentity: {
    sunSignId?: string;
    moonSignId?: string;
    risingSignId?: string;
    dominantElement?: "Fire" | "Earth" | "Air" | "Water";
    dominantPlanetIds?: string[];
    dominantSignIds?: string[];
  };
  overview: {
    motto: string;
    oneSentence: string;
    topThemes: Array<{ title: string; body: string; evidence: EvidenceRef[] }>;
  };
  signatures: SignatureCard[];
  oracleFollowUps: Array<{ label: string; prompt: string }>;
};

// ─── Strength config ──────────────────────────────────────────────────────────
const strengthConfig = {
  strong:   { label: "Strong",   color: "#34d399", bg: "rgba(52,211,153,.12)",   border: "rgba(52,211,153,.25)" },
  moderate: { label: "Moderate", color: "#fbbf24", bg: "rgba(251,191,36,.10)",   border: "rgba(251,191,36,.22)" },
  light:    { label: "Light",    color: "#38bdf8", bg: "rgba(56,189,248,.08)",   border: "rgba(56,189,248,.20)" },
};

// ─── Planet image ─────────────────────────────────────────────────────────────
function PlanetImage({
  planetId,
  size = 56,
  className = "",
}: {
  planetId: string;
  size?: number;
  className?: string;
}) {
  const cfg = planetUIConfig[planetId];
  if (!cfg?.imageUrl) return null;
  const scale = cfg.imageScale ?? 1;
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-50"
        style={{ background: cfg.themeColor }}
      />
      <img
        src={cfg.imageUrl}
        alt={planetId}
        className="relative z-10 select-none pointer-events-none"
        draggable={false}
        style={{
          width: size * scale,
          height: size * scale,
          objectFit: "contain",
          filter: `drop-shadow(0 0 ${Math.round(size / 3.5)}px ${cfg.themeColor}80)`,
        }}
      />
    </div>
  );
}

// ─── Evidence chips ───────────────────────────────────────────────────────────
function EvidenceChips({ evidence }: { evidence: EvidenceRef[] }) {
  if (!evidence?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {evidence.map((item, i) => {
        const bodyId = item.bodyId ?? item.planet1;
        const planet = bodyId ? planetUIConfig[bodyId] : null;
        const sign   = item.signId ? zodiacUIConfig[item.signId] : null;
        const aspect = !planet && !sign
          ? Object.values(aspectUIConfig).find((a) => item.label?.toLowerCase().includes(a.id))
          : null;
        const SignIcon = sign?.icon;
        const color = planet?.themeColor ?? aspect?.themeColor ?? "rgba(255,255,255,.45)";

        return (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tracking-wide"
            style={{ border: `1px solid ${color}30`, background: `${color}10`, color: `${color}CC` }}
          >
            {planet?.rulerSymbol && <span style={{ color }}>{planet.rulerSymbol}</span>}
            {SignIcon && !planet && <SignIcon className="size-3" style={{ color }} />}
            {aspect?.symbol && !planet && !SignIcon && <span style={{ color }}>{aspect.symbol}</span>}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Big Three planet card ─────────────────────────────────────────────────────
function PlanetSignCard({
  eyebrow,
  planetId,
  planetColor,
  signId,
}: {
  eyebrow: string;
  planetId: string;
  planetColor: string;
  signId?: string;
}) {
  const sign     = signId ? zodiacUIConfig[signId] : null;
  const SignIcon = sign?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4"
    >
      {/* Hover radial */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle at 70% 30%, ${planetColor}1A, transparent 65%)` }}
      />

      <div
        className="text-[10px] font-mono uppercase tracking-[0.4em]"
        style={{ color: `${planetColor}99` }}
      >
        {eyebrow}
      </div>

      {/* Sign row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {SignIcon && (
            <SignIcon
              className="size-7 shrink-0"
              style={{ color: planetColor, filter: `drop-shadow(0 0 8px ${planetColor}70)` }}
            />
          )}
          <span className="font-serif text-2xl text-white capitalize tracking-wide">
            {signId ?? "—"}
          </span>
        </div>
        <PlanetImage planetId={planetId} size={52} />
      </div>
    </motion.div>
  );
}

// ─── Theme card (bento) ───────────────────────────────────────────────────────
function ThemeCard({
  theme,
  index,
  featured = false,
}: {
  theme: { title: string; body: string; evidence: EvidenceRef[] };
  index: number;
  featured?: boolean;
}) {
  const bodyId = theme.evidence?.[0]?.bodyId ?? theme.evidence?.[0]?.planet1;
  const planet = bodyId ? planetUIConfig[bodyId] : null;
  const accent = planet?.themeColor ?? "var(--galactic)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.09 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25 flex flex-col ${
        featured ? "p-7 md:p-9" : "p-5 md:p-7"
      }`}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${accent}80 50%, transparent 100%)` }}
      />

      {/* Ambient planet watermark */}
      {bodyId && (
        <div className="absolute -bottom-4 -right-4 opacity-[0.07] group-hover:opacity-[0.14] transition-opacity duration-700 pointer-events-none">
          <PlanetImage planetId={bodyId} size={featured ? 120 : 80} />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full gap-3">
        <div
          className="text-[9px] font-mono uppercase tracking-[0.5em] opacity-70"
          style={{ color: accent }}
        >
          Theme {String(index + 1).padStart(2, "0")}
        </div>

        <h2
          className={`font-serif text-white leading-snug ${
            featured ? "text-2xl md:text-3xl" : "text-xl"
          }`}
        >
          {theme.title}
        </h2>

        <p
          className={`text-white/62 leading-7 flex-1 ${
            featured ? "text-[15px]" : "text-sm"
          }`}
        >
          {theme.body}
        </p>

        <EvidenceChips evidence={theme.evidence} />
      </div>
    </motion.div>
  );
}

// ─── Signature card (horizontal desktop layout) ────────────────────────────────
function SignatureCardBlock({
  signature,
  index,
}: {
  signature: SignatureCard;
  index: number;
}) {
  const strength = strengthConfig[signature.evidenceStrength] ?? strengthConfig.moderate;

  const dominantPlanetId =
    signature.evidence?.find((e) => e.bodyId)?.bodyId ??
    signature.evidence?.find((e) => e.planet1)?.planet1;
  const dominantSignId = signature.evidence?.find((e) => e.signId)?.signId;
  const SignIconEl      = dominantSignId ? zodiacUIConfig[dominantSignId]?.icon : null;
  const planetCfg       = dominantPlanetId ? planetUIConfig[dominantPlanetId] : null;
  const accent          = planetCfg?.themeColor ?? "var(--galactic)";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.07 }}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-black/20 print:border-black/15"
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-full opacity-60"
        style={{ background: `linear-gradient(to bottom, transparent, ${accent}, transparent)` }}
      />

      {/* Hover ambient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle at 85% 15%, ${accent}12, transparent 60%)` }}
      />

      <div className="relative z-10 flex flex-col md:flex-row gap-0">
        {/* ── Left column: planet visual + strength ── */}
        <div
          className="md:w-52 md:shrink-0 flex flex-col items-center justify-center gap-4 p-6 md:p-8 md:border-r border-white/[0.07]"
          style={{ background: `${accent}08` }}
        >
          {/* Planet image big */}
          {dominantPlanetId ? (
            <PlanetImage planetId={dominantPlanetId} size={80} />
          ) : SignIconEl ? (
            <SignIconEl
              className="size-16 opacity-40"
              style={{ color: accent }}
            />
          ) : (
            <div
              className="size-16 rounded-full opacity-20"
              style={{ background: accent }}
            />
          )}

          {/* Planet name */}
          {dominantPlanetId && (
            <div className="text-center">
              <div
                className="text-[11px] font-mono uppercase tracking-[0.35em]"
                style={{ color: `${accent}BB` }}
              >
                {planetCfg?.rulerSymbol} {dominantPlanetId}
              </div>
            </div>
          )}

          {/* Strength badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.25em]"
            style={{
              border: `1px solid ${strength.border}`,
              background: strength.bg,
              color: strength.color,
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: strength.color }} />
            {strength.label}
          </div>
        </div>

        {/* ── Right column: content ── */}
        <div className="flex-1 p-6 md:p-8 flex flex-col gap-4">
          {/* Title */}
          <h3 className="font-serif text-2xl md:text-3xl text-white leading-snug">
            {signature.emoji && <span className="mr-2 opacity-70">{signature.emoji}</span>}
            {signature.title}
          </h3>

          {/* Summary */}
          <p className="text-[15px] leading-7 text-white/68">
            {signature.shortSummary}
          </p>

          <EvidenceChips evidence={signature.evidence} />

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] text-white/15">✦</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* Gift / Watch / Practice grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Gift", value: signature.gift },
              { label: "Watch For", value: signature.watchFor },
              { label: "Practice", value: signature.practice },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1.5">
                <div
                  className="text-[9px] font-mono uppercase tracking-[0.4em]"
                  style={{ color: `${accent}99` }}
                >
                  {label}
                </div>
                <p className="text-sm text-white/70 leading-6">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Section divider ─────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-px flex-1 bg-white/[0.07]" />
      <span className="text-[9px] font-mono uppercase tracking-[0.55em] text-white/25 shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/[0.07]" />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function BirthChartReportV2Renderer({
  report,
  markdown,
}: {
  report: BirthChartReportV2;
  markdown: string;
}) {
  const element      = report.visualIdentity.dominantElement
    ? elementUIConfig[report.visualIdentity.dominantElement]
    : null;
  const elementStyles = element?.styles;
  const ElementIcon   = element?.icon;

  const sunCfg    = planetUIConfig.sun;
  const moonCfg   = planetUIConfig.moon;
  const risingCfg = planetUIConfig.rising;

  const dominantPlanets = (report.visualIdentity.dominantPlanetIds ?? []).slice(0, 3);

  // Rising sign constellation
  const risingUi = report.visualIdentity.risingSignId
    ? zodiacUIConfig[report.visualIdentity.risingSignId]
    : null;
  const sunUi = report.visualIdentity.sunSignId
    ? zodiacUIConfig[report.visualIdentity.sunSignId]
    : null;

  return (
    <div className="space-y-16 pb-16">

      {/* ═══════════════════════════════════════════════════════ HERO ══ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 print:border-0"
        style={{
          background: elementStyles
            ? `radial-gradient(ellipse at top left, ${elementStyles.primary}22, transparent 50%),
               radial-gradient(ellipse at bottom right, rgba(168,85,247,.20), transparent 55%),
               linear-gradient(160deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 100%)`
            : `radial-gradient(ellipse at top left, rgba(168,85,247,.28), transparent 50%),
               linear-gradient(160deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 100%)`,
          boxShadow: "0 32px 96px rgba(0,0,0,.40)",
        }}
      >
        {/* Decorative constellation SVG */}
        {risingUi && (
          <img
            src={risingUi.constellationUrl}
            alt=""
            className="absolute top-0 right-0 w-72 h-72 opacity-[0.06] pointer-events-none select-none"
            style={{ filter: "invert(1)" }}
          />
        )}

        {/* Floating dominant planet (large bg) */}
        {dominantPlanets[0] && (
          <div className="absolute -bottom-12 -right-12 opacity-[0.06] pointer-events-none">
            <PlanetImage planetId={dominantPlanets[0]} size={240} />
          </div>
        )}

        {/* Two-column hero on desktop */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0">

          {/* ── Left: text content ── */}
          <div className="p-7 md:p-10 lg:p-12 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 self-start">
              <div className="h-px w-4 bg-galactic/50" />
              <span className="text-[9px] font-mono uppercase tracking-[0.5em] text-galactic/65">
                Stars.Guide · Natal Report
              </span>
              <div className="h-px w-4 bg-galactic/50" />
            </div>

            <div>
              <h1 className="font-serif text-4xl md:text-5xl xl:text-6xl leading-[1.1] text-white print:text-3xl print:text-black">
                {report.meta.reportTitle}
              </h1>
              {report.overview.motto && (
                <p className="mt-4 font-serif text-lg md:text-xl italic text-galactic/75 leading-relaxed print:text-black/60">
                  &ldquo;{report.overview.motto}&rdquo;
                </p>
              )}
            </div>

            <p className="text-[15px] leading-7 text-white/60 max-w-lg print:text-black/70">
              {report.overview.oneSentence}
            </p>

            {/* Element + dominant planets */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {element && ElementIcon && (
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em]"
                  style={{
                    borderColor: `${elementStyles?.primary}35`,
                    background: `${elementStyles?.primary}10`,
                    color: elementStyles?.primary,
                  }}
                >
                  <ElementIcon className="size-3.5" />
                  {element.id} dominant
                </div>
              )}
              {dominantPlanets.map((pid) => {
                const pcfg = planetUIConfig[pid];
                if (!pcfg) return null;
                return (
                  <div
                    key={pid}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 font-mono"
                  >
                    <span style={{ color: pcfg.themeColor }}>{pcfg.rulerSymbol}</span>
                    <span className="capitalize tracking-wide">{pid}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Big Three stacked ── */}
          <div className="lg:border-l border-t lg:border-t-0 border-white/[0.07] p-6 lg:p-8 flex flex-col gap-4 lg:justify-center bg-black/15">
            <div className="text-[9px] font-mono uppercase tracking-[0.45em] text-white/25 mb-1">
              The Big Three
            </div>
            <PlanetSignCard
              eyebrow="☉  Sun Sign"
              planetId="sun"
              planetColor={sunCfg.themeColor}
              signId={report.visualIdentity.sunSignId}
            />
            <PlanetSignCard
              eyebrow="☾  Moon Sign"
              planetId="moon"
              planetColor={moonCfg.themeColor}
              signId={report.visualIdentity.moonSignId}
            />
            <PlanetSignCard
              eyebrow="↑  Rising Sign"
              planetId="rising"
              planetColor={risingCfg.themeColor}
              signId={report.visualIdentity.risingSignId}
            />
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════ CORE THEMES ══ */}
      {report.overview.topThemes.length > 0 && (
        <section>
          <SectionLabel label="Core Themes" />

          {/* Bento grid: first card large, rest smaller */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {report.overview.topThemes.map((theme, i) => (
              <div
                key={theme.title}
                className={i === 0 ? "md:col-span-2 lg:col-span-2 lg:row-span-1" : ""}
              >
                <ThemeCard theme={theme} index={i} featured={i === 0} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════ SIGNATURES ══ */}
      {report.signatures.length > 0 && (
        <section>
          <SectionLabel label="Natal Signatures" />
          <div className="space-y-5">
            {report.signatures.map((sig, i) => (
              <SignatureCardBlock key={sig.id} signature={sig} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════ ORACLE FOLLOW-UPS ══ */}
      {report.oracleFollowUps.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-[1.75rem] border border-galactic/15 bg-galactic/[0.04] p-7 md:p-8 print:hidden"
          style={{ boxShadow: "0 0 48px rgba(168,85,247,.06)" }}
        >
          <div className="text-[9px] font-mono uppercase tracking-[0.5em] text-galactic/55 mb-3">
            Continue Exploring
          </div>
          <h2 className="font-serif text-2xl text-white mb-5">Ask the Oracle next</h2>
          <div className="flex flex-wrap gap-2.5">
            {report.oracleFollowUps.map((item) => (
              <span
                key={item.label}
                title={item.prompt}
                className="rounded-full border border-galactic/20 bg-galactic/[0.06] px-4 py-2 text-sm text-white/65 hover:bg-galactic/[0.12] hover:text-white/90 transition-colors cursor-default"
              >
                {item.label}
              </span>
            ))}
          </div>
        </motion.section>
      )}

      {/* ══════════════════════════════════ FULL MARKDOWN BODY ══ */}
      <section>
        <SectionLabel label="Full Reading" />
        <BirthChartReportRenderer markdown={markdown} />
      </section>
    </div>
  );
}
