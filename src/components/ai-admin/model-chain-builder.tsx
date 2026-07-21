"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModelsForProvider, type AIModelEntry } from "@/lib/ai/registry";
import type { ProviderConfig } from "@/lib/oracle/providers";
import type { ModelChainEntry } from "@/lib/ai/inference-preferences";

interface ModelChainBuilderProps {
  value: ModelChainEntry[];
  providers: ProviderConfig[];
  onChange: (value: ModelChainEntry[]) => void;
}

type Preset = { id: string; label: string };

function presetsForModel(model: AIModelEntry): Preset[] {
  if (!model.variants?.length) return [{ id: model.id, label: model.name }];
  return model.variants.map((variant) => ({
    id: `${model.id}:${variant.id}`,
    label: `${model.name} · ${variant.name}`,
  }));
}

export function ModelChainBuilder({ value, providers, onChange }: ModelChainBuilderProps) {
  const patchRow = (index: number, patch: Partial<ModelChainEntry>) => {
    onChange(value.map((entry, rowIndex) => rowIndex === index ? { ...entry, ...patch } : entry));
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const addRow = () => {
    onChange([...value, { providerId: providers[0]?.id ?? "", model: "" }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Fallback chain</Label>
          <p className="mt-1 text-xs text-muted-foreground">Oracle tries these routes from top to bottom.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="size-3.5" /> Add route
        </Button>
      </div>

      {value.length === 0 ? (
        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-xl border border-dashed border-white/15 bg-black/10 px-4 py-8 text-sm text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
        >
          Add the first provider and model
        </button>
      ) : (
        <div className="space-y-2">
          {value.map((entry, index) => {
            const provider = providers.find((candidate) => candidate.id === entry.providerId);
            const presets = provider
              ? getModelsForProvider(provider).flatMap(presetsForModel)
              : [];
            const presetValue = presets.some((preset) => preset.id === entry.model) ? entry.model : "__custom";
            return (
              <div key={`${index}-${entry.providerId}`} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {index === 0 ? "Primary" : `Fallback ${index}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move route up">
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label="Move route down">
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive/75 hover:text-destructive" onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove route">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Select
                    value={entry.providerId || undefined}
                    onValueChange={(providerId) => patchRow(index, { providerId, model: "" })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose provider" /></SelectTrigger>
                    <SelectContent>
                      {providers.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={presetValue}
                    onValueChange={(model) => model !== "__custom" && patchRow(index, { model })}
                    disabled={!provider}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose model preset" /></SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>)}
                      <SelectItem value="__custom">Custom model ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={entry.model}
                  onChange={(event) => patchRow(index, { model: event.target.value })}
                  placeholder="Model ID, for example gemma4:31b"
                  className="mt-2 font-mono text-xs"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
