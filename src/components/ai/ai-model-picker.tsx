"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  type AIModelEntry,
  type ProviderConfig,
  type ProviderType,
  PROVIDER_TYPE_INFO,
  parseProvidersConfig,
  getModelsForProvider,
  findModelMetaForProvider,
  getModelWarnings,
} from "@/lib/ai/registry";
import { ModelCombobox } from "./model-combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Network, Key } from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface AIModelPickerProps {
  /** Currently selected provider ID (e.g. "openrouter") */
  providerId: string;
  /** Currently selected model ID (e.g. "google/gemini-2.5-flash" or "gemma4:e2b") */
  modelId: string;
  /** Called when the user changes the provider */
  onProviderChange: (providerId: string) => void;
  /** Called when the user selects or types a model (includes variant tag if applicable) */
  onModelChange: (modelId: string) => void;
  /** Whether to show the provider selector. Default: true */
  showProvider?: boolean;
  /** Whether to show capability warnings. Default: true */
  showWarnings?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /**
   * Provider source mode.
   * - "oracle_settings" (default): reads providers from the oracle_settings table.
   * - "explicit": pass providers directly via the `providers` prop.
   */
  providerSource?: "oracle_settings" | "explicit";
  /** When providerSource="explicit", pass the provider list directly */
  providers?: ProviderConfig[];
  /** Optional label override */
  label?: string;
  /** Layout mode */
  layout?: "grid" | "stacked";
}

// ─── INTERNAL: VARIANT RESOLVER ─────────────────────────────────────────────

/**
 * Split a model ID into base + variant tag.
 * "gemma4:e2b" → { baseId: "gemma4", variant: "e2b" }
 * "deepseek-v4-flash" → { baseId: "deepseek-v4-flash", variant: null }
 */
function splitModelId(id: string): { baseId: string; variant: string | null } {
  const idx = id.indexOf(":");
  if (idx === -1) return { baseId: id, variant: null };
  return { baseId: id.slice(0, idx), variant: id.slice(idx + 1) };
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

/**
 * AIModelPicker — Single Source of Truth UI component for selecting
 * an AI provider + model (+ variant/weight if required).
 *
 * When a model has variants (e.g. gemma4 → e2b/e4b/26b/31b), a weight
 * dropdown appears and the emitted model ID includes the tag: "gemma4:e2b".
 */
export function AIModelPicker({
  providerId,
  modelId,
  onProviderChange,
  onModelChange,
  showProvider = true,
  showWarnings = true,
  disabled = false,
  providerSource = "oracle_settings",
  providers: explicitProviders,
  label,
  layout = "grid",
}: AIModelPickerProps) {
  // ── Load providers from oracle_settings ──
  const settings = useQuery(api.oracle.settings.listAllSettings);

  const providers: ProviderConfig[] = React.useMemo(() => {
    if (providerSource === "explicit") {
      return explicitProviders ?? [];
    }
    if (!settings) return [];
    const raw = settings.find((s: { key: string; value: string }) => s.key === "providers_config")?.value;
    return parseProvidersConfig(raw);
  }, [providerSource, explicitProviders, settings]);

  const effectiveProviderId = React.useMemo(() => {
    if (providers.length === 0) return "";
    if (providers.find((p) => p.id === providerId)) return providerId;
    return providers[0].id;
  }, [providers, providerId]);

  // Auto-select first provider on mount if current one is invalid
  React.useEffect(() => {
    if (providers.length > 0 && !providers.find((p) => p.id === providerId)) {
      onProviderChange(providers[0].id);
    }
  }, [providers]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeProvider = providers.find((p) => p.id === effectiveProviderId);
  const models = activeProvider ? getModelsForProvider(activeProvider) : [];

  // ── Resolve the base model ID and variant from the current modelId ──
  const { baseId, variant } = React.useMemo(
    () => splitModelId(modelId),
    [modelId]
  );

  // Look up whether the base model has variants defined in the registry
  const baseMeta: AIModelEntry | undefined = React.useMemo(
    () =>
      activeProvider
        ? findModelMetaForProvider(baseId, activeProvider.type)
        : undefined,
    [baseId, activeProvider]
  );

  const modelHasVariants = !!baseMeta?.variants && baseMeta.variants.length > 0;

  // Auto-select first variant when a model with variants is chosen without one
  React.useEffect(() => {
    if (baseMeta?.variants && baseMeta.variants.length > 0 && !variant) {
      onModelChange(`${baseId}:${baseMeta.variants[0].id}`);
    }
  }, [baseId, baseMeta, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const handleModelSelect = React.useCallback(
    (selectedBaseId: string) => {
      const meta = activeProvider
        ? findModelMetaForProvider(selectedBaseId, activeProvider.type)
        : undefined;
      if (meta?.variants && meta.variants.length > 0) {
        // Auto-pick the first variant
        onModelChange(`${selectedBaseId}:${meta.variants[0].id}`);
      } else {
        onModelChange(selectedBaseId);
      }
    },
    [activeProvider, onModelChange]
  );

  const handleVariantChange = React.useCallback(
    (tag: string) => {
      onModelChange(`${baseId}:${tag}`);
    },
    [baseId, onModelChange]
  );

  // ── Loading state ──
  if (providerSource === "oracle_settings" && settings === undefined) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {label ?? "LLM Model"}
        </Label>
        <div className="h-10 rounded-md border border-border/30 bg-background/50 animate-pulse" />
      </div>
    );
  }

  // ── No providers configured ──
  if (providers.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {label ?? "LLM Model"}
        </Label>
        <ModelCombobox
          models={[]}
          value={modelId}
          onChange={onModelChange}
          placeholder="Type a model ID (e.g. x-ai/grok-4.1-fast)..."
          disabled={disabled}
          showWarnings={showWarnings}
        />
        <p className="text-xs text-muted-foreground">
          No providers configured in Oracle Settings. Type any model ID manually.
        </p>
      </div>
    );
  }

  // ── Build the model + variant selector ──
  const variantSelector = modelHasVariants && baseMeta ? (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Weight</Label>
      <Select
        value={variant ?? baseMeta.variants![0].id}
        onValueChange={handleVariantChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-background/50">
          <SelectValue placeholder="Select weight..." />
        </SelectTrigger>
        <SelectContent>
          {baseMeta.variants!.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  // ── Warnings ──
  const currentWarnings =
    showWarnings && modelId ? getModelWarnings(modelId, activeProvider?.type) : [];

  const warningsBlock = currentWarnings.length > 0 ? (
    <div className="col-span-full space-y-1">
      {currentWarnings.map((w, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
          <span>⚠</span>
          <span>{w}</span>
        </div>
      ))}
    </div>
  ) : null;

  // ── Render ──
  const content = (
    <>
      {showProvider && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select
            value={effectiveProviderId}
            onValueChange={(id) => {
              onProviderChange(id);
              onModelChange("");
            }}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Provider..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span>{p.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono px-1 py-0 border-white/10 text-muted-foreground"
                    >
                      {PROVIDER_TYPE_INFO[p.type].label}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeProvider && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                {activeProvider.baseUrl}
              </span>
              {activeProvider.apiKeyEnvVar && (
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  {activeProvider.apiKeyEnvVar}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Model</Label>
        <ModelCombobox
          models={models}
          value={baseId}
          onChange={handleModelSelect}
          placeholder="Select or type a model..."
          disabled={disabled}
          showWarnings={false}
          providerType={activeProvider?.type}
        />
      </div>
      {variantSelector}
      {warningsBlock}
    </>
  );

  if (!showProvider) {
    return (
      <div className="space-y-2">
        {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <ModelCombobox
              models={models}
              value={baseId}
              onChange={handleModelSelect}
              placeholder="Select or type a model..."
              disabled={disabled}
              showWarnings={false}
              providerType={activeProvider?.type}
            />
          </div>
          {variantSelector && <div className="w-28 shrink-0">{variantSelector}</div>}
        </div>
        {warningsBlock}
      </div>
    );
  }

  if (layout === "stacked") {
    return <div className="space-y-3">{content}</div>;
  }

  // grid layout — 3 columns when variant is present
  const gridCols = variantSelector
    ? "grid gap-3 sm:grid-cols-[1fr_2fr_100px]"
    : "grid gap-3 sm:grid-cols-[1fr_2fr]";

  return <div className={gridCols}>{content}</div>;
}

// ─── CONVENIENCE HOOK ───────────────────────────────────────────────────────

export function useAIModelPicker(opts?: {
  defaultProvider?: string;
  defaultModel?: string;
}) {
  const [providerId, setProviderId] = React.useState(opts?.defaultProvider ?? "openrouter");
  const [modelId, setModelId] = React.useState(opts?.defaultModel ?? "google/gemini-2.5-flash");

  return {
    providerId,
    modelId,
    setProviderId,
    setModelId,
    props: {
      providerId,
      modelId,
      onProviderChange: setProviderId,
      onModelChange: setModelId,
    },
  };
}
