"use client";

import * as React from "react";
import { Check, ChevronsUpDown, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type AIModelEntry,
  type ModelCapability,
  MODEL_CAPABILITIES,
  findModelMeta,
  getModelWarnings,
} from "@/lib/ai/registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ModelComboboxProps {
  /** Known model entries for the active provider type */
  models: AIModelEntry[];
  /** Current model ID value */
  value: string;
  /** Called when the user selects or types a model */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** If true, show warnings for thinking/embedding models */
  showWarnings?: boolean;
  /** Provider type context (for looking up capabilities of custom models) */
  providerType?: string;
}

/**
 * ModelCapabilityBadges — Renders capability badges for a model.
 * Can be used standalone outside the combobox.
 */
export function ModelCapabilityBadges({
  capabilities,
  size = "sm",
}: {
  capabilities: ModelCapability[];
  size?: "sm" | "xs";
}) {
  if (capabilities.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <span className="inline-flex items-center gap-1">
        {capabilities.map((cap) => {
          const meta = MODEL_CAPABILITIES[cap];
          return (
            <Tooltip key={cap}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 py-0 font-mono border",
                    meta.borderColor,
                    meta.color,
                    size === "xs" ? "text-[9px] leading-tight" : "text-[10px]"
                  )}
                >
                  {meta.shortLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <p className="font-medium">{meta.label}</p>
                <p className="text-muted-foreground mt-0.5">{meta.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}

/**
 * ModelWarning — Displays warnings for problematic model selections.
 */
function ModelWarning({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-1.5 text-xs text-amber-400"
        >
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * AI Model Combobox — Enhanced model selector with capability badges.
 *
 * Features:
 * - Shows capability badges (THINK, VISION, CODE, FAST, FREE, etc.) on each model
 * - Warns when selecting thinking/embedding models
 * - Supports custom model ID entry
 * - Tooltips on badges for descriptions
 *
 * Usage:
 *   <ModelCombobox
 *     models={getModelsForProviderType("ollama")}
 *     value={selectedModel}
 *     onChange={setSelectedModel}
 *     showWarnings
 *   />
 */
export function ModelCombobox({
  models,
  value,
  onChange,
  placeholder = "Select or type a model...",
  disabled = false,
  showWarnings = true,
  providerType,
}: ModelComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Resolve the current model's metadata (from registry or custom)
  const currentMeta = value
    ? models.find((m) => m.id === value) ?? findModelMeta(value)
    : undefined;

  const currentWarnings =
    showWarnings && value ? getModelWarnings(value, providerType as any) : [];

  return (
    <div className="space-y-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between border-white/10 bg-black/20"
          >
            <span className="flex items-center gap-2 truncate">
              {currentMeta ? (
                <>
                  <span className="truncate">{currentMeta.name}</span>
                  <ModelCapabilityBadges
                    capabilities={currentMeta.capabilities}
                    size="xs"
                  />
                </>
              ) : value ? (
                <span className="truncate font-mono text-xs">{value}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[460px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or type custom model..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      onChange(inputValue);
                      setOpen(false);
                    }}
                  >
                    Use custom model: &quot;{inputValue}&quot;
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup heading="Known Models">
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={(selected) => {
                      // shadcn Command lowercases — find the original entry
                      const actual = models.find(
                        (m) => m.id.toLowerCase() === selected.toLowerCase()
                      );
                      onChange(actual?.id ?? selected);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex flex-col">
                        <span className="text-sm">{model.name}</span>
                        {model.description && (
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {model.description}
                          </span>
                        )}
                      </span>
                    </span>
                    <ModelCapabilityBadges
                      capabilities={model.capabilities}
                      size="xs"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              {inputValue &&
                !models.some(
                  (m) => m.id.toLowerCase() === inputValue.toLowerCase()
                ) && (
                  <CommandGroup heading="Custom">
                    <CommandItem
                      value={inputValue}
                      onSelect={() => {
                        onChange(inputValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === inputValue ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Use custom: {inputValue}
                    </CommandItem>
                  </CommandGroup>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showWarnings && currentWarnings.length > 0 && (
        <ModelWarning warnings={currentWarnings} />
      )}
    </div>
  );
}
