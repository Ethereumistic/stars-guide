"use client";

import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OracleConversationSection, OracleConversationTurn } from "../_types";
import { getOracleTurnStatusCopy } from "./oracle-turn-status-copy";

export function OracleTurnStatus({
  turn,
  sections,
  stopping,
  onStop,
}: {
  turn: OracleConversationTurn;
  sections: OracleConversationSection[];
  stopping: boolean;
  onStop: () => void;
}) {
  if (!turn.active) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-galactic/15 bg-galactic/[0.045] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5" role="status" aria-live="polite" aria-atomic="true">
        <Loader2 className="size-3.5 shrink-0 animate-spin text-galactic/80 motion-reduce:animate-none" aria-hidden="true" />
        <span className="truncate font-serif text-sm text-white/55">{getOracleTurnStatusCopy(turn, sections)}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onStop}
        disabled={stopping || turn.status === "cancel_requested"}
        className="h-7 shrink-0 rounded-lg border border-white/10 px-2.5 text-xs text-white/55 hover:border-rose-300/20 hover:bg-rose-300/[0.06] hover:text-rose-100"
      >
        <Square className="mr-1.5 size-3 fill-current" aria-hidden="true" />
        {turn.status === "cancel_requested" ? "Stopping" : "Stop"}
      </Button>
    </div>
  );
}
