"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Search, Settings2 } from "lucide-react";
import { useUserStore } from "@/store/use-user-store";
import { SimpleJournalComposer } from "@/components/journal/simple-journal-composer";
import { StreamTimeline } from "./stream-timeline";
import { DetailPanel } from "@/components/journal/detail/detail-panel";
import { CalendarTab } from "./calendar-tab";
import { SearchTab } from "./search-tab";
import { ConsentSettings } from "@/components/journal/consent/consent-settings";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";

const { api: convexApi } = require("../../../../convex/_generated/api") as any;

type View = "journal" | "calendar" | "search" | "settings";

export function JournalStreamPage({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useUserStore();
  const requested = params.get("tab");
  const view: View = requested === "calendar" || requested === "search" || requested === "settings" ? requested : "journal";
  const [entryId, setEntryId] = React.useState<string | null>(params.get("entry"));
  const consent = useQuery(convexApi.journal.consent.getConsent) as any;
  const firstName = user?.username?.split(/[_\s]/)[0] || "there";

  function setView(next: View) {
    router.replace(next === "journal" ? "/journal" : `/journal?tab=${next}`);
  }

  return (
    <div className={cn("h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_50%_-15%,rgba(130,102,235,0.16),transparent_38%)]", className)}>
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-7 sm:px-7 sm:pt-10">
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#a999ed]">Your journal</p>
            <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] text-white sm:text-5xl">A quiet place, {firstName}.</h1>
            <p className="mt-2 text-sm text-white/40">Write freely. Everything else can wait.</p>
          </div>
          <nav aria-label="Journal views" className="flex w-fit rounded-full border border-white/10 bg-white/[0.035] p-1">
            {([
              ["journal", BookOpen, "Journal"], ["calendar", CalendarDays, "Calendar"], ["search", Search, "Search"], ["settings", Settings2, "Settings"],
            ] as const).map(([key, Icon, label]) => (
              <button key={key} type="button" aria-label={label} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)} className={cn("flex h-9 items-center gap-2 rounded-full px-3 text-xs transition", view === key ? "bg-white/10 text-white" : "text-white/35 hover:text-white/70")}><Icon className="h-4 w-4" /><span className="hidden md:inline">{label}</span></button>
            ))}
          </nav>
        </header>

        {view === "journal" && <div className="space-y-12"><SimpleJournalComposer initialContent={params.get("prompt") || ""} autoFocus={params.get("compose") === "true"} /><section><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-2xl text-white/90">Past reflections</h2><button onClick={() => setView("search")} className="text-xs text-white/35 hover:text-white/70">Find an entry</button></div><StreamTimeline onEntryClick={setEntryId} /></section></div>}
        {view === "calendar" && <CalendarTab onEntryClick={setEntryId} />}
        {view === "search" && <SearchTab onEntryClick={setEntryId} />}
        {view === "settings" && <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8"><h2 className="mb-2 font-serif text-2xl text-white">Oracle access</h2><p className="mb-7 max-w-xl text-sm leading-6 text-white/40">Choose whether Oracle can use your reflections when you ask for guidance.</p>{consent ? <ConsentSettings consent={consent} /> : <p className="text-sm text-white/35">Oracle does not have access to your journal.</p>}</section>}
      </main>
      <DetailPanel entryId={entryId} open={entryId !== null} onClose={() => setEntryId(null)} editMode={params.get("edit") === "true"} />
    </div>
  );
}
