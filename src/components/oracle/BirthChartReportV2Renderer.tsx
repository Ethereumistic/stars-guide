"use client";

import { BirthChartReportRenderer } from "./BirthChartReportRenderer";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { elementUIConfig } from "@/config/elements-ui";

type EvidenceRef = { type: string; label: string; bodyId?: string; signId?: string; houseId?: number; planet1?: string; planet2?: string; orb?: number };

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

export function BirthChartReportV2Renderer({ report, markdown }: { report: BirthChartReportV2; markdown: string }) {
  const element = report.visualIdentity.dominantElement ? elementUIConfig[report.visualIdentity.dominantElement] : null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.025))] p-6 shadow-[0_24px_80px_rgba(0,0,0,.28)] print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="text-xs font-semibold uppercase tracking-[0.34em] text-galactic/75 print:text-black/60">Interactive Birth Chart Report</div>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-white md:text-5xl print:text-3xl print:text-black">{report.meta.reportTitle}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-white/78 print:text-black/75">{report.overview.oneSentence}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <BigThreeCard label="☉ Sun" signId={report.visualIdentity.sunSignId} />
          <BigThreeCard label="☾ Moon" signId={report.visualIdentity.moonSignId} />
          <BigThreeCard label="↑ Rising" signId={report.visualIdentity.risingSignId} />
        </div>
        {element && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 print:text-black/75">
            <element.icon className="size-4" /> Dominant element: {element.id}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3 print:block">
        {report.overview.topThemes.map((theme) => (
          <div key={theme.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 print:border-black/15 print:bg-transparent">
            <h2 className="font-serif text-xl text-white print:text-black">{theme.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/70 print:text-black/75">{theme.body}</p>
            <EvidenceChips evidence={theme.evidence} />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-white print:text-black">Dominant Signatures</h2>
        <div className="grid gap-4 md:grid-cols-2 print:block">
          {report.signatures.map((signature) => (
            <article key={signature.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 print:border-black/15 print:bg-transparent">
              <div className="text-xs uppercase tracking-[0.22em] text-galactic/75">{signature.evidenceStrength} evidence</div>
              <h3 className="mt-2 font-serif text-2xl text-white print:text-black">{signature.emoji} {signature.title}</h3>
              <p className="mt-3 leading-7 text-white/75 print:text-black/75">{signature.shortSummary}</p>
              <EvidenceChips evidence={signature.evidence} />
              <div className="mt-4 grid gap-2 text-sm text-white/72 print:text-black/75">
                <p><strong className="text-white print:text-black">Gift:</strong> {signature.gift}</p>
                <p><strong className="text-white print:text-black">Watch for:</strong> {signature.watchFor}</p>
                <p><strong className="text-white print:text-black">Practice:</strong> {signature.practice}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-galactic/20 bg-galactic/[0.06] p-5 print:hidden">
        <h2 className="font-serif text-2xl text-white">Ask Oracle next</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.oracleFollowUps.map((item) => (
            <span key={item.label} title={item.prompt} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/75">{item.label}</span>
          ))}
        </div>
      </section>

      <BirthChartReportRenderer markdown={markdown} />
    </div>
  );
}

function BigThreeCard({ label, signId }: { label: string; signId?: string }) {
  const sign = signId ? zodiacUIConfig[signId] : null;
  const Icon = sign?.icon;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4 print:border-black/15 print:bg-transparent">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45 print:text-black/60">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold capitalize text-white print:text-black">
        {Icon && <Icon className="size-5 text-galactic" />}
        {signId ?? "Unknown"}
      </div>
    </div>
  );
}

function EvidenceChips({ evidence }: { evidence: EvidenceRef[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {evidence.map((item, index) => {
        const planet = item.bodyId ? planetUIConfig[item.bodyId] : item.planet1 ? planetUIConfig[item.planet1] : null;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/68 print:border-black/15 print:text-black/70">
            {planet?.rulerSymbol ? <span>{planet.rulerSymbol}</span> : null}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
