"use client";

import * as React from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { OracleChartPreview } from "@/components/oracle/input/oracle-chart-preview";
import { SynastryCard } from "@/components/oracle/input/synastry-card";
import { BinauralBeatsCard } from "@/components/oracle/input/binaural-beats-card";
import { OracleFeatureMenu } from "@/components/oracle/input/oracle-feature-menu";
import { OracleModelMenu } from "@/components/oracle/input/oracle-model-menu";
import { OracleReasoningMenu } from "@/components/oracle/input/oracle-reasoning-menu";
import {
  OracleDictationButton,
  type OracleDictationHandle,
} from "@/components/oracle/input/oracle-dictation-button";
import { useAutosizeTextarea } from "@/components/oracle/input/use-autosize-textarea";
import { Button } from "@/components/ui/button";
import type { OracleBirthData } from "@/lib/oracle/featureContext";
import {
  type OracleFeatureDefinition,
  type OracleFeatureKey,
  type BirthChartDepth,
  getOracleFeature,
  isBirthChartFeature,
  isSynastryFeature,
} from "@/lib/oracle/features";
import type { BinauralBeatParams } from "@/lib/binaural-presets";
import type { SynastryState } from "@/store/use-oracle-store";
import type { StoredBirthData } from "@/lib/birth-chart/types";
import type { OracleModelOption, ReasoningEffort } from "@/lib/ai/inference-preferences";

const getJournalConsentRef = makeFunctionReference<
  "query",
  Record<string, never>,
  { oracleCanReadJournal: boolean } | null
>("journal/consent:getConsent");

interface OracleInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
  canSubmit?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  featureKey?: OracleFeatureKey | null;
  onFeatureSelect: (featureKey: OracleFeatureKey) => void;
  onFeatureClear: () => void;
  birthData?: OracleBirthData | null;
  username?: string | null;
  onBinauralGenerate?: (params: BinauralBeatParams) => void;
  birthChartDepth?: BirthChartDepth;
  onBirthChartDepthChange?: (depth: BirthChartDepth) => void;
  synastryState?: SynastryState | null;
  onSetSynastryChartB?: (data: StoredBirthData, name: string, source: "friend" | "custom", friendUserId?: string) => void;
  onSetSynastryRelationship?: (relationship: string, category?: string) => void;
  onClearSynastry?: () => void;
  onClearSynastryChartB?: () => void;
  modelOptions?: OracleModelOption[];
  modelOptionKey?: string;
  onModelOptionChange?: (optionKey: string) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (effort: ReasoningEffort) => void;
  onUpgrade?: () => void;
}

export function OracleInput({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  canSubmit = false,
  inputRef,
  featureKey,
  onFeatureSelect,
  onFeatureClear,
  birthData,
  username,
  onBinauralGenerate,
  birthChartDepth = "core",
  onBirthChartDepthChange,
  synastryState,
  onSetSynastryChartB,
  onSetSynastryRelationship,
  onClearSynastryChartB,
  modelOptions = [],
  modelOptionKey = "automatic",
  onModelOptionChange,
  reasoningEffort = "auto",
  onReasoningEffortChange,
  onUpgrade,
}: OracleInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const dictationRef = React.useRef<OracleDictationHandle | null>(null);
  useAutosizeTextarea(textareaRef, value);

  const setTextareaRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (inputRef) inputRef.current = node;
  }, [inputRef]);

  const activeFeature = getOracleFeature(featureKey);
  const showBirthPreview = isBirthChartFeature(featureKey);
  const showBinauralBeats = featureKey === "binaural_beats";
  const showSynastry = isSynastryFeature(featureKey);
  const showFeatureBadge = activeFeature && !showBirthPreview && !showSynastry && !showBinauralBeats;
  const consent = useQuery(getJournalConsentRef, {});
  const selectedModel = modelOptions.find((option) => option.optionKey === modelOptionKey)
    ?? modelOptions.find((option) => option.available);
  const allowedEfforts = selectedModel?.allowedReasoningEfforts ?? [reasoningEffort];

  const isFeatureDisabled = (feature: OracleFeatureDefinition): boolean => {
    if (!feature.implemented) return true;
    if (feature.requiresJournalConsent) {
      return consent === undefined || consent === null || !consent.oracleCanReadJournal;
    }
    return false;
  };

  const getFeatureDisabledReason = (feature: OracleFeatureDefinition): string | null => {
    if (!feature.implemented) return "Coming soon";
    if (feature.requiresJournalConsent) {
      if (consent === undefined) return "Checking journal access…";
      if (consent === null || !consent.oracleCanReadJournal) return "Enable Oracle access in Journal settings";
    }
    return null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      canSubmit &&
      !disabled
    ) {
      event.preventDefault();
      dictationRef.current?.stop();
      onSubmit();
    }
  };

  const handleSubmit = () => {
    dictationRef.current?.stop();
    onSubmit();
  };

  return (
    <div className="space-y-3">
      {showBirthPreview && (
        <OracleChartPreview birthData={birthData} username={username} depth={birthChartDepth} onDepthChange={onBirthChartDepthChange} onDismiss={onFeatureClear} />
      )}

      {showSynastry && (
        <SynastryCard
          birthData={birthData}
          username={username}
          synastryData={synastryState ?? null}
          onSetChartB={onSetSynastryChartB ?? (() => {})}
          onSetRelationship={onSetSynastryRelationship ?? (() => {})}
          onDismiss={onFeatureClear}
          onClearChartB={onClearSynastryChartB}
        />
      )}

      {showBinauralBeats && (
        <BinauralBeatsCard onDismiss={onFeatureClear} onGenerate={onBinauralGenerate} />
      )}

      <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/[0.11] bg-[#12111a]/94 shadow-[0_22px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-colors duration-300 focus-within:border-white/[0.18]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-galactic/85 to-primary/75 opacity-35 transition-opacity duration-300 group-focus-within:opacity-100" />
        <div className="px-4 pt-3.5 sm:px-5 sm:pt-4">
          {showFeatureBadge && activeFeature && (
            <div className="mb-2.5 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-galactic/25 bg-galactic/10 px-2.5 py-1 text-[11px] text-white/75">
                <Sparkles className="size-3 text-galactic" />
                <span>{activeFeature.shortLabel}</span>
                <button type="button" onClick={onFeatureClear} className="rounded-full p-0.5 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label={`Clear ${activeFeature.shortLabel}`}>
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          <textarea
            ref={setTextareaRef}
            rows={1}
            value={value}
            maxLength={2000}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Oracle message input"
            className="block min-h-8 w-full resize-none overflow-y-hidden bg-transparent py-1 text-[15px] leading-6 text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          />
          {value.length >= 1800 && (
            <div className="mt-1 text-right font-mono text-[9px] text-white/30" aria-live="polite">{value.length}/2000</div>
          )}
        </div>

        <div className="flex min-h-14 items-center gap-0.5 px-2.5 pb-2 pt-1.5 sm:px-3">
          <OracleFeatureMenu
            disabled={disabled}
            isFeatureDisabled={isFeatureDisabled}
            getFeatureDisabledReason={getFeatureDisabledReason}
            onFeatureSelect={onFeatureSelect}
          />
          <div className="min-w-1 flex-1" />
          {modelOptions.length > 0 && onModelOptionChange && (
            <OracleModelMenu
              options={modelOptions}
              selectedOptionKey={modelOptionKey}
              onSelect={onModelOptionChange}
              onUpgrade={onUpgrade}
              disabled={disabled}
            />
          )}
          {onReasoningEffortChange && (
            <OracleReasoningMenu
              allowed={allowedEfforts}
              value={reasoningEffort}
              onChange={onReasoningEffortChange}
              disabled={disabled}
            />
          )}
          <OracleDictationButton ref={dictationRef} value={value} onValueChange={onValueChange} disabled={disabled} />
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!canSubmit || disabled}
            className={`size-10 shrink-0 rounded-full transition-all duration-200 ${canSubmit && !disabled ? "bg-galactic text-white shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:bg-galactic/90" : "bg-white/[0.07] text-white/25 hover:bg-white/[0.07]"}`}
            aria-label="Send message"
          >
            <ArrowUp className="size-[18px]" />
          </Button>
        </div>
      </div>
    </div>
  );
}
