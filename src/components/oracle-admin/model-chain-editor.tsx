"use client";

import * as React from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import {
  ProviderConfig,
  ModelChainEntry,
  KNOWN_MODELS_PER_PROVIDER_TYPE,
  tierForIndex,
} from "@/lib/oracle/providers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ModelCombobox } from "./model-combobox";

interface ModelChainEditorProps {
  chain: ModelChainEntry[];
  providers: ProviderConfig[];
  onChange: (chain: ModelChainEntry[]) => void;
}

export function ModelChainEditor({ chain, providers, onChange }: ModelChainEditorProps) {
  const [newProviderId, setNewProviderId] = React.useState<string>("");
  const [newModel, setNewModel] = React.useState<string>("");

  React.useEffect(() => {
    if (providers.length > 0 && !newProviderId) {
      setNewProviderId(providers[0].id);
    }
  }, [providers, newProviderId]);

  const handleAdd = () => {
    if (!newProviderId || !newModel) return;
    onChange([
      ...chain,
      { providerId: newProviderId, model: newModel },
    ]);
    setNewModel("");
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

  const activeProvider = providers.find(p => p.id === newProviderId);
  const knownModels = activeProvider 
    ? KNOWN_MODELS_PER_PROVIDER_TYPE[activeProvider.type] || []
    : [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {chain.map((entry, index) => {
          const provider = providers.find(p => p.id === entry.providerId);
          return (
            <Card key={`${entry.providerId}-${entry.model}-${index}`} className="border-border/50 bg-card/50">
              <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0 border-galactic/30 text-galactic font-mono text-sm bg-galactic/10">
                    {tierForIndex(index)}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{entry.model}</p>
                    <p className="text-xs text-muted-foreground">{provider?.name || <span className="text-red-400">Unknown Provider ({entry.providerId})</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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

      <div className="rounded-xl border border-white/10 p-4 space-y-4 bg-black/20">
        <h4 className="text-sm font-medium">Add Model to Chain</h4>
        <div className="grid grid-cols-[1fr_2fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Provider</Label>
            <Select value={newProviderId} onValueChange={setNewProviderId}>
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
              options={knownModels}
              value={newModel}
              onChange={setNewModel}
              disabled={!newProviderId}
            />
          </div>
          <Button onClick={handleAdd} disabled={!newProviderId || !newModel}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
