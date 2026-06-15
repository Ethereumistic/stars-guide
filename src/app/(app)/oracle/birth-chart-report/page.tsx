"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { BirthChartReportRenderer } from "@/components/oracle/BirthChartReportRenderer";
import { Loader2, Printer } from "lucide-react";

export default function BirthChartReportPage() {
  const report = useQuery(api.birthChartReport.queue.getMyReport);

  if (report === undefined) {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center text-white/70 bg-transparent">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (!report || report.status !== "completed" || !report.markdown) {
    return (
      <main className="flex-1 overflow-y-auto grid place-items-center px-6 text-center text-white bg-transparent">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="font-serif text-2xl">Your report is not ready yet.</p>
          <p className="mt-3 text-sm text-white/60">Start or complete your Birth Chart Report from the Oracle.</p>
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
      <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
        <BirthChartReportRenderer markdown={report.markdown} />
        <div className="no-print mt-10 flex justify-center border-t border-white/10 pt-8">
          <Button onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="size-4" /> Print / PDF
          </Button>
        </div>
      </div>
    </main>
  );
}
