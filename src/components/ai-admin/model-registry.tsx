"use client";

import * as React from "react";
import {
  type ProviderConfig,
  type ProviderType,
  PROVIDER_TYPES,
  PROVIDER_TYPE_INFO,
} from "@/lib/oracle/providers";
import {
  type AIModelEntry,
  type ModelCapability,
  KNOWN_MODELS,
  MODEL_CAPABILITIES,
  getModelsForProvider,
} from "@/lib/ai/registry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Brain, Eye, Code, Zap, DollarSign, Wrench, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelRegistryProps {
  providers: ProviderConfig[];
}

const CAPABILITY_ICONS: Record<ModelCapability, React.ReactNode> = {
  thinking: <Brain className="h-3 w-3" />,
  vision: <Eye className="h-3 w-3" />,
  code: <Code className="h-3 w-3" />,
  fast: <Zap className="h-3 w-3" />,
  free: <DollarSign className="h-3 w-3" />,
  embedding: <Layers className="h-3 w-3" />,
  tool_use: <Wrench className="h-3 w-3" />,
};

export function ModelRegistry({ providers }: ModelRegistryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterProviderType, setFilterProviderType] = React.useState<ProviderType | "all">("all");
  const [filterCapability, setFilterCapability] = React.useState<ModelCapability | "all">("all");

  // Gather all models across selected provider type(s)
  const allModels = React.useMemo(() => {
    if (filterProviderType !== "all") {
      return KNOWN_MODELS[filterProviderType] ?? [];
    }
    // Merge all provider types, dedup by ID
    const seen = new Set<string>();
    const merged: AIModelEntry[] = [];
    for (const pt of PROVIDER_TYPES) {
      for (const m of KNOWN_MODELS[pt]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      }
    }
    return merged;
  }, [filterProviderType]);

  const filteredModels = React.useMemo(() => {
    let result = allModels;
    if (filterCapability !== "all") {
      result = result.filter(m => m.capabilities.includes(filterCapability));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allModels, filterCapability, searchQuery]);

  const providerTypesWithModels = PROVIDER_TYPES.filter(
    pt => KNOWN_MODELS[pt] && KNOWN_MODELS[pt].length > 0
  );

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{allModels.length}</p>
            <p className="text-xs text-muted-foreground">Total Models</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {allModels.filter(m => m.capabilities.includes("thinking")).length}
            </p>
            <p className="text-xs text-muted-foreground">Thinking Models</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {allModels.filter(m => m.capabilities.includes("vision")).length}
            </p>
            <p className="text-xs text-muted-foreground">Vision Models</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-400">
              {allModels.filter(m => m.capabilities.includes("free")).length}
            </p>
            <p className="text-xs text-muted-foreground">Free Tier</p>
          </CardContent>
        </Card>
      </div>

      {/* Thinking Models Warning */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-amber-300">
                Thinking / Reasoning Models — Important Usage Note
              </p>
              <p className="text-xs text-muted-foreground">
                Models tagged <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 px-1 py-0">THINK</Badge> produce
                chain-of-thought before answering. For structured tasks (horoscope generation, JSON output),
                they may exhaust their token budget on reasoning and return empty <code className="text-[10px] bg-muted px-1 rounded">content</code>.
                The system now automatically disables thinking mode for such tasks when calling Ollama providers (<code className="text-[10px] bg-muted px-1 rounded">think: false</code>).
                For OpenRouter, use the reasoning effort controls. Always test a model before deploying it for generation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models by name or ID..."
            className="pl-9 border-white/10 bg-black/20"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterProviderType} onValueChange={(v: any) => setFilterProviderType(v)}>
            <SelectTrigger className="w-[180px] border-white/10 bg-black/20">
              <SelectValue placeholder="Provider type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providerTypesWithModels.map(pt => (
                <SelectItem key={pt} value={pt}>
                  {PROVIDER_TYPE_INFO[pt].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCapability} onValueChange={(v: any) => setFilterCapability(v)}>
            <SelectTrigger className="w-[150px] border-white/10 bg-black/20">
              <SelectValue placeholder="Capability..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Capabilities</SelectItem>
              {(["thinking", "vision", "code", "fast", "free", "tool_use", "embedding"] as ModelCapability[]).map(cap => (
                <SelectItem key={cap} value={cap}>
                  <span className="flex items-center gap-2">
                    {CAPABILITY_ICONS[cap]}
                    {MODEL_CAPABILITIES[cap].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Model Grid */}
      {filteredModels.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No models match your filters.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredModels.map((model) => (
            <ModelCard key={model.id} model={model} providers={providers} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCard({ model, providers }: { model: AIModelEntry; providers: ProviderConfig[] }) {
  const isThinking = model.capabilities.includes("thinking");
  const isEmbedding = model.capabilities.includes("embedding");

  // Find which provider types have this model
  const availableOn = PROVIDER_TYPES.filter(pt =>
    KNOWN_MODELS[pt]?.some(m => m.id === model.id)
  );

  const matchingProviders = providers.filter(p =>
    availableOn.includes(p.type)
  );

  return (
    <Card className={cn(
      "border-border/50 bg-card/50 transition-colors",
      isThinking && "border-purple-500/20",
      isEmbedding && "border-gray-500/20",
    )}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{model.name}</h4>
            <p className="text-xs font-mono text-muted-foreground truncate">{model.id}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {model.capabilities.map(cap => {
              const meta = MODEL_CAPABILITIES[cap];
              return (
                <TooltipProvider key={cap} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 py-0 font-mono border text-[9px]",
                          meta.borderColor,
                          meta.color,
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
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {model.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {model.description}
          </p>
        )}

        {model.variants && model.variants.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Weights:</span>
            {model.variants.map(v => (
              <Badge
                key={v.id}
                variant="secondary"
                className="text-[9px] px-1.5 py-0 bg-white/5"
              >
                {v.id}:{model.id}
                {` → ${model.id}:${v.id}`}
              </Badge>
            ))}
          </div>
        )}

        {/* Warnings */}
        {isThinking && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-400 bg-amber-500/5 rounded-md p-2 border border-amber-500/10">
            <Brain className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Reasoning model — may produce empty content if thinking exhausts token budget.
              The system sends <code className="text-[10px] bg-muted px-0.5 rounded">think:false</code> (Ollama) +
              <code className="text-[10px] bg-muted px-0.5 rounded">reasoning_effort:none</code> (OpenRouter + compat) for structured tasks.
              Some providers (Together/Groq) may not support thinking control — test first!
            </span>
          </div>
        )}
        {isEmbedding && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-500/5 rounded-md p-2 border border-red-500/10">
            <Layers className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Embedding model — cannot generate text. Do not use for chat, horoscopes, or any generation task.</span>
          </div>
        )}

        {/* Available on which providers */}
        {matchingProviders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Available via:</span>
            {matchingProviders.map(p => (
              <Badge key={p.id} variant="outline" className="text-[9px] px-1.5 py-0 border-white/10">
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}