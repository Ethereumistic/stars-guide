"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { OracleAssistantMessage } from "./oracle-assistant-message";
import type { OracleConversationSection, OracleConversationTurn } from "../_types";

const PublishedSection = React.memo(function PublishedSection({ section }: { section: OracleConversationSection }) {
  return (
    <section className="relative pl-6" aria-labelledby={`oracle-section-${section._id}`}>
      <span className="absolute left-0 top-1.5 flex size-4 items-center justify-center rounded-full border border-galactic/35 bg-background text-galactic">
        <Check className="size-2.5" aria-hidden="true" />
      </span>
      <span className="absolute bottom-[-1.5rem] left-[0.47rem] top-5 w-px bg-linear-to-b from-galactic/25 to-transparent" aria-hidden="true" />
      <h2 id={`oracle-section-${section._id}`} className="mb-2 font-serif text-lg text-white/90">{section.title}</h2>
      <OracleAssistantMessage content={section.content ?? ""} />
    </section>
  );
});

export function OracleSectionStream({
  turn,
  sections,
}: {
  turn: OracleConversationTurn;
  sections: OracleConversationSection[];
}) {
  const ordered = React.useMemo(
    () => sections.filter((section) => section.turnId === turn._id).sort((a, b) => a.ordinal - b.ordinal),
    [sections, turn._id],
  );
  const published = ordered.filter((section) => section.status === "published" && section.content);
  const pending = ordered.find((section) => section.status !== "published" && section.status !== "failed");

  return (
    <div className="space-y-6">
      {published.map((section) => <PublishedSection key={section._id} section={section} />)}
      {pending && turn.active && (
        <div className="flex items-center gap-2.5 pl-6 text-sm text-white/35" role="status" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin text-galactic/65 motion-reduce:animate-none" aria-hidden="true" />
          <span>Preparing {pending.title}…</span>
        </div>
      )}
    </div>
  );
}
