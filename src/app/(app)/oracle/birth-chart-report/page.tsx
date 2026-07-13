"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { BirthChartReportRenderer } from "@/components/oracle/BirthChartReportRenderer";
import { BirthChartReportV2Renderer } from "@/components/oracle/BirthChartReportV2Renderer";
import { BirthChartReportExperience } from "@/components/oracle/BirthChartReportExperience";
import type { StoredBirthData } from "@/lib/birth-chart/types";
import { Loader2, Printer, RefreshCw, Sparkles } from "lucide-react";

type LegacyStructuredReport = ComponentProps<typeof BirthChartReportV2Renderer>["report"];
type HumanReportV3 = ComponentProps<typeof BirthChartReportExperience>["report"];
type ReportRecord = {
  status: "pending" | "generating" | "completed" | "failed";
  markdown?: string;
  structured?: unknown;
  errorMessage?: string;
  oracleSessionId?: string;
  version?: number;
};
type ReportEnvelope = { report: ReportRecord | null; birthData: StoredBirthData | null };

const getMyBirthChartReportRef = makeFunctionReference<"query", Record<string, never>, ReportEnvelope | null>("birthChartReport/queue:getMyReport");
const createReportSessionRef = makeFunctionReference<"mutation", Record<string, never>, string>("oracle/sessions:createBirthChartReportSession");
const enqueueReportRef = makeFunctionReference<"action", { priority?: number }, { jobId: string; alreadyQueued: boolean }>("birthChartReport/queue:enqueueMyReportGeneration");

function isV3(value: unknown): value is HumanReportV3 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const meta = (value as { meta?: unknown }).meta;
  return Boolean(meta && typeof meta === "object" && !Array.isArray(meta) && (meta as { version?: unknown }).version === 3);
}

export default function BirthChartReportPage() {
  const router = useRouter();
  const envelope = useQuery(getMyBirthChartReportRef);
  const createReportSession = useMutation(createReportSessionRef);
  const enqueueReport = useAction(enqueueReportRef);

  const openReportStudio = async () => {
    const sessionId = await createReportSession({});
    router.push(`/oracle/chat/${sessionId}`);
  };

  if (envelope === undefined) {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center text-white/70 bg-transparent">
        <div className="flex flex-col items-center gap-4"><Loader2 className="size-7 animate-spin text-galactic/80" /><p className="text-sm font-mono uppercase tracking-[0.3em] text-white/30">Reading the stars…</p></div>
      </main>
    );
  }

  const report = envelope?.report ?? null;
  const birthData = envelope?.birthData ?? null;
  const isWorking = report?.status === "pending" || report?.status === "generating";

  if (!birthData || !report || report.status !== "completed") {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center px-6 text-center text-white bg-transparent">
        <div className="max-w-md space-y-5">
          <div className="mx-auto size-16 rounded-full border border-galactic/20 bg-galactic/[0.08] grid place-items-center">{isWorking ? <Loader2 className="size-7 animate-spin text-galactic/70" /> : <Sparkles className="size-7 text-galactic/70" />}</div>
          <div>
            <p className="font-serif text-2xl text-white mb-2">{!birthData ? "Add your birth details first" : report?.status === "failed" ? "Your report needs another pass" : isWorking ? "Your report is taking shape" : "Your chart, made readable"}</p>
            <p className="text-sm text-white/50 leading-6">{!birthData ? "A birth date, exact time, and location are required to calculate the chart." : report?.status === "failed" ? "Generation stopped before it met the quality standard. You can safely retry." : isWorking ? "The server is checking every interpretation against your calculated chart." : "Create a concise visual field guide from your calculated chart. Oracle remains available before, during, and after generation."}</p>
          </div>
          {birthData && report?.status === "failed" ? (
            <Button onClick={() => void enqueueReport({ priority: 2 })} className="gap-2 rounded-xl"><RefreshCw className="size-4" /> Retry report</Button>
          ) : birthData && !isWorking ? (
            <Button onClick={() => void openReportStudio()} className="gap-2 rounded-xl"><Sparkles className="size-4" /> Create my report</Button>
          ) : report?.oracleSessionId ? (
            <Button variant="outline" onClick={() => router.push(`/oracle/chat/${report.oracleSessionId}`)} className="rounded-xl border-white/15 bg-white/[0.04]">View progress</Button>
          ) : null}
        </div>
      </main>
    );
  }

  const structured = report.structured;
  const legacy = !isV3(structured);
  return (
    <main className="flex-1 overflow-y-auto bg-transparent text-white print:bg-white print:text-black">
      <style>{`@media print { .no-print { display: none !important; } .birth-chart-report { color: #111 !important; box-shadow: none !important; } .birth-chart-report * { border-color: #ddd !important; } main { background: white !important; } }`}</style>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 print:px-0 print:py-0">
        {isV3(structured) && birthData ? (
          <BirthChartReportExperience report={structured} birthData={birthData} />
        ) : structured ? (
          <BirthChartReportV2Renderer report={structured as LegacyStructuredReport} markdown={report.markdown ?? ""} />
        ) : report.markdown ? (
          <BirthChartReportRenderer markdown={report.markdown} />
        ) : null}
        <div className="no-print mt-8 flex flex-wrap justify-center gap-3 border-t border-white/8 pt-8">
          {legacy && <Button onClick={() => void enqueueReport({ priority: 2 })} variant="outline" className="gap-2 rounded-xl border-violet-300/20 bg-violet-300/[0.04] text-violet-100/70"><RefreshCw className="size-4" /> Upgrade visual report</Button>}
          <Button onClick={() => window.print()} variant="outline" className="gap-2 rounded-xl border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"><Printer className="size-4" /> Save as PDF</Button>
        </div>
      </div>
    </main>
  );
}
