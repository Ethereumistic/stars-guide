"use client";

import * as React from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import {
  type ProviderConfig,
  type ModelChainEntry,
  tierForIndex,
} from "@/lib/oracle/providers";
import {
  type AIModelEntry,
  getModelsForProvider,
  findModelMetaForProvider,
} from "@/lib/ai/registry";
import { ModelCombobox, ModelCapabilityBadges } from "@/components/ai/model-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelChainEditorProps {
  chain: ModelChainEntry[];
  providers: ProviderConfig[];
  onChange: (chain: ModelChainEntry[]) => void;
}

/** Split "gemma4:e2b" → { base: "gemma4", variant: "e2b" } */
function splitModelId(id: string) {
  const i = id.indexOf(":");
  return i === -1 ? { base: id, variant: null } : { base: id.slice(0, i), variant: id.slice(i + 1) };
}

export function ModelChainEditor({ chain, providers, onChange }: ModelChainEditorProps) {
  const [newProviderId, setNewProviderId] = React.useState<string>("");
  const [newModelBase, setNewModelBase] = React.useState<string>("");
  const [newVariant, setNewVariant] = React.useState<string>("");

  React.useEffect(() => {
    if (providers.length > 0 && !newProviderId) {
      setNewProviderId(providers[0].id);
    }
  }, [providers, newProviderId]);

  const activeProvider = providers.find(p => p.id === newProviderId);
  const knownModels = activeProvider ? getModelsForProvider(activeProvider) : [];

  // Resolve the current model's variant metadata
  const newModelMeta: AIModelEntry | undefined = activeProvider && newModelBase
    ? findModelMetaForProvider(newModelBase, activeProvider.type)
    : undefined;
  const hasVariants = !!newModelMeta?.variants && newModelMeta.variants.length > 0;

  // Auto-select first variant when a model with variants is chosen
  React.useEffect(() => {
    if (hasVariants && !newVariant) {
      setNewVariant(newModelMeta!.variants![0].id);
    }
    if (!hasVariants) {
      setNewVariant("");
    }
  }, [newModelBase, hasVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    if (!newProviderId || !newModelBase) return;
    const fullId = hasVariants && newVariant ? `${newModelBase}:${newVariant}` : newModelBase;
    onChange([
      ...chain,
      { providerId: newProviderId, model: fullId },
    ]);
    setNewModelBase("");
    setNewVariant("");
  };

  const handleRemove = (index: number) => {
    const newChain = [...chain];
    newChain.splice(index, 1);
    onChange(newChain);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newChain = [...chain];
    [newChain[index - 1], newChain[index]] = [newChain[index], newChain[index - 1]];
    onChange(newChain);
  };

  const handleMoveDown = (index: number) => {
    if (index === chain.length - 1) return;
    const newChain = [...chain];
    [newChain[index + 1], newChain[index]] = [newChain[index], newChain[index + 1]];
    onChange(newChain);
  };

  return (
    <div className="space-y-4">
      {/* Existing chain entries */}
      <div className="space-y-2">
        {chain.map((entry, index) => {
          const provider = providers.find(p => p.id === entry.providerId);
          const { base: entryBase } = splitModelId(entry.model);
          const entryMeta = provider
            ? findModelMetaForProvider(entryBase, provider.type)
            : undefined;
          return (
            <Card key={`${entry.providerId}-${entry.model}-${index}`} className="border-border/50 bg-card/50">
              <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0 border-galactic/30 text-galactic font-mono text-sm bg-galactic/10 shrink-0">
                    {tierForIndex(index)}
                  </Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm font-mono truncate">{entry.model}</p>
                      {entryMeta && (
                        <ModelCapabilityBadges
                          capabilities={entryMeta.capabilities}
                          size="xs"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {provider?.name ?? <span className="text-red-400">Unknown Provider ({entry.providerId})</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-8 h-8" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8" disabled={index === chain.length - 1} onClick={() => handleMoveDown(index)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleRemove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {chain.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl border-border/50">
            No models in chain. Oracle will not work.
          </div>
        )}
      </div>

      {/* Add new entry */}
      <div className="rounded-xl border border-white/10 p-4 space-y-4 bg-black/20">
        <h4 className="text-sm font-medium">Add Model to Chain</h4>
        <div className={`gap-3 items-end ${hasVariants ? "grid grid-cols-[1fr_2fr_100px_auto]" : "grid grid-cols-[1fr_2fr_auto]"}`}>
          <div className="space-y-1">
            <Label className="text-xs">Provider</Label>
            <Select value={newProviderId} onValueChange={(id) => { setNewProviderId(id); setNewModelBase(""); setNewVariant(""); }}>
              <SelectTrigger className="bg-black/20">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Model</Label>
            <ModelCombobox
              models={knownModels}
              value={newModelBase}
              onChange={setNewModelBase}
              disabled={!newProviderId}
              showWarnings
              providerType={activeProvider?.type}
            />
          </div>
          {hasVariants && newModelMeta && (
            <div className="space-y-1">
              <Label className="text-xs">Weight</Label>
              <Select value={newVariant} onValueChange={setNewVariant}>
                <SelectTrigger className="bg-black/20">
                  <SelectValue placeholder="Weight..." />
                </SelectTrigger>
                <SelectContent>
                  {newModelMeta.variants!.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleAdd} disabled={!newProviderId || !newModelBase || (hasVariants && !newVariant)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
