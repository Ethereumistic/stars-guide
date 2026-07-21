"use client";

import { Check, ChevronDown, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelOptionLogo } from "@/components/ai/model-option-logo";
import type { OracleModelOption } from "@/lib/ai/inference-preferences";
import { trackFeature } from "@/lib/analytics";

interface OracleModelMenuProps {
  options: OracleModelOption[];
  selectedOptionKey: string;
  onSelect: (optionKey: string) => void;
  onUpgrade?: () => void;
  disabled?: boolean;
}

export function OracleModelMenu({
  options,
  selectedOptionKey,
  onSelect,
  onUpgrade,
  disabled,
}: OracleModelMenuProps) {
  const selected = options.find((option) => option.optionKey === selectedOptionKey)
    ?? options.find((option) => option.available)
    ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || !selected}
          className="h-9 max-w-[10rem] gap-1.5 rounded-full px-2.5 font-serif text-xs text-white/65 hover:bg-white/[0.08] hover:text-white sm:max-w-[14rem] sm:text-sm"
          aria-label={`Model: ${selected?.label ?? "Automatic"}`}
        >
          <ModelOptionLogo
            src={selected?.logoUrl}
            className="size-5 border-galactic/20 bg-galactic/10 text-galactic"
            fallback={<Sparkles className="size-3" />}
          />
          <span className="truncate">{selected?.label ?? "Automatic"}</span>
          <ChevronDown className="size-3 shrink-0 text-white/35" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={10}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden border-white/10 bg-background/90 p-0 text-foreground shadow-2xl shadow-black/40 backdrop-blur-2xl"
      >
        <DropdownMenuLabel className="px-3.5 py-3 font-normal">
          <p className="font-serif text-sm">Choose an Oracle model</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Fallbacks stay automatic if a model is unavailable.</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-1.5">
          {options.map((option) => {
            const active = option.optionKey === selected?.optionKey;
            return (
              <DropdownMenuItem
                key={option.optionKey}
                onSelect={() => {
                  if (option.available) {
                    onSelect(option.optionKey);
                    return;
                  }
                  trackFeature("oracle_model_upgrade_click", {
                    optionKey: option.optionKey,
                    requiredTier: option.requiredTier ?? "popular",
                  }, "revenue");
                  onUpgrade?.();
                }}
                className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 focus:bg-white/[0.07]"
              >
                <ModelOptionLogo
                  src={option.logoUrl}
                  className={`mt-0.5 size-7 ${active ? "border-galactic/35 bg-galactic/15 text-galactic" : "border-white/10 bg-white/[0.035] text-white/35"}`}
                  fallback={active ? <Check className="size-3.5" /> : option.available ? <Sparkles className="size-3.5" /> : <LockKeyhole className="size-3.5" />}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-serif text-sm text-foreground">{option.label}</span>
                    {option.badge && <span className="rounded-full border border-galactic/20 bg-galactic/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-galactic">{option.badge}</span>}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                    {!option.available
                      ? `${option.requiredTier === "premium" ? "Premium" : "Popular"} plan required`
                      : option.description ?? "An Oracle-ready model route."}
                  </span>
                  {option.available && option.usageHint && <span className="mt-1 block text-[10px] text-primary/75">{option.usageHint}</span>}
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
