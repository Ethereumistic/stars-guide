"use client";

/**
 * Horoscope Model Selector — Thin wrapper around the shared AIModelPicker.
 *
 * This component is kept for backward compatibility — all horoscope pages
 * that previously imported HoroscopeModelSelector continue to work.
 *
 * Under the hood it uses AIModelPicker from @/components/ai which is the
 * single source of truth for provider/model selection across the app.
 */

import { AIModelPicker } from "@/components/ai";

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

export function HoroscopeModelSelector({
  providerId,
  modelId,
  onProviderChange,
  onModelChange,
  showProvider = true,
  disabled = false,
}: HoroscopeModelSelectorProps) {
  return (
    <AIModelPicker
      providerId={providerId}
      modelId={modelId}
      onProviderChange={onProviderChange}
      onModelChange={onModelChange}
      showProvider={showProvider}
      showWarnings={true}
      disabled={disabled}
      providerSource="oracle_settings"
    />
  );
}
