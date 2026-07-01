"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { BirthChartReportRenderer } from "@/components/oracle/BirthChartReportRenderer";
import { BirthChartReportV2Renderer } from "@/components/oracle/BirthChartReportV2Renderer";
import { Loader2, Printer, Sparkles } from "lucide-react";

export default function BirthChartReportPage() {
  const report = useQuery(api.birthChartReport.queue.getMyReport);

  if (report === undefined) {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center text-white/70 bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-7 animate-spin text-galactic/80" />
          <p className="text-sm font-mono uppercase tracking-[0.3em] text-white/30">Reading the stars…</p>
        </div>
      </main>
    );
  }

  if (!report || report.status !== "completed" || !report.markdown) {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center px-6 text-center text-white bg-transparent">
        <div className="max-w-sm space-y-5">
          <div className="mx-auto size-16 rounded-full border border-galactic/20 bg-galactic/[0.08] grid place-items-center">
            <Sparkles className="size-7 text-galactic/70" />
          </div>
          <div>
            <p className="font-serif text-2xl text-white mb-2">Your report awaits</p>
            <p className="text-sm text-white/50 leading-6">
              Start your Birth Chart Report from the Oracle to unlock your complete natal analysis.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent text-white print:bg-white print:text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .birth-chart-report { color: #111 !important; }
          .birth-chart-report * { color: #111 !important; border-color: #ddd !important; }
          main { background: white !important; }
        }
      `}</style>
      <div className="mx-auto max-w-5xl px-5 py-10 print:px-0 print:py-0">
        {report.structured ? (
          <BirthChartReportV2Renderer report={report.structured} markdown={report.markdown} />
        ) : (
          <BirthChartReportRenderer markdown={report.markdown} />
        )}
        <div className="no-print mt-12 flex justify-center border-t border-white/8 pt-8">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2 rounded-xl border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <Printer className="size-4" /> Save as PDF
          </Button>
        </div>
      </div>
    </main>
  );
}
