"use client";

import { Plus, Sparkles } from "lucide-react";
import { GiLinkedRings, GiMazeCornea, GiMusicalNotes, GiScrollUnfurled } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ORACLE_FEATURES, type OracleFeatureDefinition, type OracleFeatureKey } from "@/lib/oracle/features";

interface OracleFeatureMenuProps {
  disabled?: boolean;
  isFeatureDisabled: (feature: OracleFeatureDefinition) => boolean;
  getFeatureDisabledReason: (feature: OracleFeatureDefinition) => string | null;
  onFeatureSelect: (featureKey: OracleFeatureKey) => void;
}

function FeatureIcon({ featureKey }: { featureKey: OracleFeatureKey }) {
  const className = "size-[18px] text-galactic";
  if (featureKey === "birth_chart") return <GiMazeCornea className={className} />;
  if (featureKey === "binaural_beats") return <GiMusicalNotes className={className} />;
  if (featureKey === "journal_recall") return <GiScrollUnfurled className={className} />;
  if (featureKey === "synastry") return <GiLinkedRings className={className} />;
  return <Sparkles className={className} />;
}

export function OracleFeatureMenu({
  disabled,
  isFeatureDisabled,
  getFeatureDisabledReason,
  onFeatureSelect,
}: OracleFeatureMenuProps) {
  const features = ORACLE_FEATURES.filter((feature) => feature.menuGroup === "primary");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="size-10 shrink-0 rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-1 focus-visible:ring-galactic/60"
          aria-label="Open Oracle tools"
        >
          <Plus className="size-5" />
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
          <p className="font-serif text-sm text-foreground">Oracle tools</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Bring a focused lens to your question.</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-1.5">
          {features.map((feature) => {
            const featureDisabled = isFeatureDisabled(feature);
            const reason = getFeatureDisabledReason(feature);
            return (
              <DropdownMenuItem
                key={feature.key}
                disabled={featureDisabled}
                onSelect={() => !featureDisabled && onFeatureSelect(feature.key)}
                className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-foreground/80 focus:bg-white/[0.07] focus:text-foreground"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-galactic/20 bg-galactic/[0.08]">
                  <FeatureIcon featureKey={feature.key} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{feature.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                    {reason ?? feature.description}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
