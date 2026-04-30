"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ProviderConfig,
  parseProvidersConfig,
  KNOWN_MODELS_PER_PROVIDER_TYPE,
} from "@/lib/oracle/providers";
import { ModelCombobox } from "@/components/oracle-admin/model-combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HoroscopeModelSelectorProps {
  /** Current provider ID from oracle_settings, e.g. "openrouter" */
  providerId: string;
  /** Current model ID string, e.g. "x-ai/grok-4.1-fast" */
  modelId: string;
  /** Called when the user changes the provider */
  onProviderChange: (providerId: string) => void;
  /** Called when the user selects or types a model */
  onModelChange: (modelId: string) => void;
  /** Whether to show the provider selector. Defaults to true. */
  showProvider?: boolean;
  disabled?: boolean;
}

/**
 * HoroscopeModelSelector — A model picker that reads providers from the
 * Oracle settings (oracle_settings table) and lets the admin pick a
 * provider + model (or type any custom model ID).
 *
 * Outputs both providerId and modelId so the backend routes correctly.
 */
export function HoroscopeModelSelector({
  providerId,
  modelId,
  onProviderChange,
  onModelChange,
  showProvider = true,
  disabled = false,
}: HoroscopeModelSelectorProps) {
  const settings = useQuery(api.oracle.settings.listAllSettings);

  // Parse providers from oracle_settings
  const providers: ProviderConfig[] = React.useMemo(() => {
    if (!settings) return [];
    const raw = settings.find((s) => s.key === "providers_config")?.value;
    return parseProvidersConfig(raw);
  }, [settings]);

  // Sync: if the current providerId isn't in the list, default to first
  const effectiveProviderId = React.useMemo(() => {
    if (providers.length === 0) return "";
    if (providers.find((p) => p.id === providerId)) return providerId;
    return providers[0].id;
  }, [providers, providerId]);

  // Auto-select first provider on mount if none selected
  React.useEffect(() => {
    if (providers.length > 0 && !providers.find((p) => p.id === providerId)) {
      onProviderChange(providers[0].id);
    }
  }, [providers]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeProvider = providers.find((p) => p.id === effectiveProviderId);
  const knownModels = activeProvider
    ? KNOWN_MODELS_PER_PROVIDER_TYPE[activeProvider.type] || []
    : [];

  // Loading state
  if (settings === undefined) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">LLM Model</Label>
        <div className="h-10 rounded-md border border-border/30 bg-background/50 animate-pulse" />
      </div>
    );
  }

  // No providers configured — allow typing any model
  if (providers.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">LLM Model</Label>
        <ModelCombobox
          options={[]}
          value={modelId}
          onChange={onModelChange}
          placeholder="Type a model ID (e.g. x-ai/grok-4.1-fast)..."
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          No providers configured in Oracle Settings. Type any model ID manually.
        </p>
      </div>
    );
  }

  // Full provider + model selector
  if (showProvider) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <Select value={effectiveProviderId} onValueChange={(id) => onProviderChange(id)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Provider..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <ModelCombobox
              options={knownModels}
              value={modelId}
              onChange={onModelChange}
              placeholder="Select or type a model..."
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  // No provider selector — just the combobox
  return (
    <div className="space-y-1">
      <ModelCombobox
        options={knownModels}
        value={modelId}
        onChange={onModelChange}
        placeholder="Select or type a model..."
        disabled={disabled}
      />
    </div>
  );
}
