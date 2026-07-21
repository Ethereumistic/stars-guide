"use client";

import { Brain, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  REASONING_EFFORT_LABELS,
  type ReasoningEffort,
} from "@/lib/ai/inference-preferences";

interface OracleReasoningMenuProps {
  allowed: ReasoningEffort[];
  value: ReasoningEffort;
  onChange: (effort: ReasoningEffort) => void;
  disabled?: boolean;
}

export function OracleReasoningMenu({ allowed, value, onChange, disabled }: OracleReasoningMenuProps) {
  const label = REASONING_EFFORT_LABELS[value] ?? "Auto";
  if (allowed.length <= 1) {
    return (
      <div className="flex h-9 items-center gap-1.5 rounded-full px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40" aria-label={`Reasoning effort: ${label}`}>
        <Brain className="size-3.5 text-galactic/70" /><span className="hidden sm:inline">{label}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled} className="h-9 gap-1.5 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55 hover:bg-white/[0.08] hover:text-white" aria-label={`Reasoning effort: ${label}`}>
          <Brain className="size-3.5 text-galactic/80" /><span className="hidden sm:inline">{label}</span><ChevronDown className="size-3 text-white/35" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-64 border-white/10 bg-background/90 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <DropdownMenuLabel className="px-3.5 py-3 font-normal"><p className="font-serif text-sm">Reasoning effort</p><p className="mt-0.5 text-[11px] text-muted-foreground">Choose how deeply Oracle considers this reading.</p></DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-1.5">
          {allowed.map((effort) => (
            <DropdownMenuItem key={effort} onSelect={() => onChange(effort)} className="cursor-pointer gap-3 rounded-lg px-3 py-2.5">
              <span className={`flex size-6 items-center justify-center rounded-full border ${value === effort ? "border-galactic/35 bg-galactic/15 text-galactic" : "border-white/10 text-transparent"}`}><Check className="size-3" /></span>
              <span><span className="block text-sm">{REASONING_EFFORT_LABELS[effort]}</span><span className="block text-[10px] text-muted-foreground">{effort === "auto" ? "Let the model decide" : effort === "disabled" ? "Answer without extended reasoning" : `${REASONING_EFFORT_LABELS[effort]} analysis depth`}</span></span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
