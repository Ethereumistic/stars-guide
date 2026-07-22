"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OracleConversationTurn } from "../_types";

export function OracleTurnError({
  turn,
  recovering,
  onRecover,
}: {
  turn: OracleConversationTurn;
  recovering: boolean;
  onRecover: () => void;
}) {
  if (!(["incomplete", "failed", "cancelled"] as const).includes(turn.status as "incomplete" | "failed" | "cancelled")) {
    return null;
  }
  const resumable = turn.status === "incomplete" && turn.publicationMode === "validated_sections";
  const title = turn.status === "cancelled"
    ? "Response stopped"
    : turn.status === "incomplete"
      ? "The response was interrupted"
      : "Oracle couldn’t complete this response";
  const detail = turn.safeErrorMessage
    ?? (resumable
      ? "Continue only the missing sections; approved parts will stay in place."
      : "Try the reading again when you’re ready.");

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.045] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex min-w-0 gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-200/75" aria-hidden="true" />
        <div>
          <p className="font-serif text-sm text-white/80">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/40">{detail}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRecover}
        disabled={recovering}
        className="h-8 shrink-0 rounded-lg border-amber-100/15 bg-transparent text-xs text-white/65 hover:bg-amber-100/[0.06] hover:text-white"
      >
        <RotateCcw className={`mr-1.5 size-3.5 ${recovering ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        {resumable ? "Resume" : "Try again"}
      </Button>
    </div>
  );
}
