"use client";

import { ArrowUpRight, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamEntryCardProps { entry: any; onClick?: () => void; className?: string; }

export function StreamEntryCard({ entry, onClick, className }: StreamEntryCardProps) {
  const preview = (entry.content || entry.gratitudeItems?.join(" · ") || "Untitled reflection").trim();
  const date = new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <button type="button" onClick={onClick} className={cn("group flex w-full items-start gap-4 rounded-2xl border border-transparent px-4 py-4 text-left transition hover:border-white/[0.08] hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a995f2]/60", className)}>
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#9d8be8]/70" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-serif text-base leading-7 text-white/72">{preview}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-white/28"><span>{date}</span>{entry.isPinned && <><span>·</span><Pin className="h-3 w-3" /><span>Pinned</span></>}</div>
      </div>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/15 transition group-hover:text-white/50" />
    </button>
  );
}
