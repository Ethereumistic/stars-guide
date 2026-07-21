"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  normalizeReasoningEffort,
  type OracleComposerCapabilities,
  type OracleModelOption,
  type ReasoningEffort,
} from "@/lib/ai/inference-preferences";

const capabilitiesRef = makeFunctionReference<"query">(
  "aiGateway/userModelOptions:getComposerCapabilities",
);

const automaticOption: OracleModelOption = {
  optionKey: "automatic",
  label: "Automatic",
  description: "Oracle chooses the best available model.",
  badge: "Default",
  available: true,
  allowedReasoningEfforts: ["auto"],
  defaultReasoningEffort: "auto",
};

export function useOracleComposerPreferences(initial?: {
  modelOptionKey?: string | null;
  reasoningEffort?: ReasoningEffort | null;
}) {
  const capabilities = useQuery(capabilitiesRef, {}) as OracleComposerCapabilities | null | undefined;
  const options = React.useMemo(
    () => capabilities?.options?.length ? capabilities.options : [automaticOption],
    [capabilities],
  );
  const [modelOptionKey, setModelOptionKey] = React.useState(initial?.modelOptionKey ?? "automatic");
  const [reasoningEffort, setReasoningEffort] = React.useState<ReasoningEffort>(initial?.reasoningEffort ?? "auto");

  React.useEffect(() => {
    if (initial?.modelOptionKey) setModelOptionKey(initial.modelOptionKey);
    if (initial?.reasoningEffort) setReasoningEffort(initial.reasoningEffort);
  }, [initial?.modelOptionKey, initial?.reasoningEffort]);

  React.useEffect(() => {
    if (!capabilities) return;
    setModelOptionKey((current) => {
      const currentOption = options.find(
        (option) => option.optionKey === current && option.available,
      );
      return currentOption?.optionKey
        ?? options.find(
          (option) => option.optionKey === capabilities.defaultOptionKey && option.available,
        )?.optionKey
        ?? options.find((option) => option.available)?.optionKey
        ?? automaticOption.optionKey;
    });
  }, [capabilities, options]);

  const selectedOption = options.find((option) => option.optionKey === modelOptionKey)
    ?? options.find((option) => option.available)
    ?? automaticOption;

  React.useEffect(() => {
    setReasoningEffort((current) => normalizeReasoningEffort(
      current,
      selectedOption.allowedReasoningEfforts,
      selectedOption.defaultReasoningEffort,
    ));
  }, [selectedOption]);

  const selectModelOption = React.useCallback((optionKey: string) => {
    const option = options.find((candidate) => candidate.optionKey === optionKey && candidate.available);
    if (!option) return;
    setModelOptionKey(option.optionKey);
    setReasoningEffort((current) => normalizeReasoningEffort(
      current,
      option.allowedReasoningEfforts,
      option.defaultReasoningEffort,
    ));
  }, [options]);

  const selectReasoningEffort = React.useCallback((effort: ReasoningEffort) => {
    setReasoningEffort(normalizeReasoningEffort(
      effort,
      selectedOption.allowedReasoningEfforts,
      selectedOption.defaultReasoningEffort,
    ));
  }, [selectedOption]);

  return {
    capabilities,
    options,
    selectedOption,
    modelOptionKey,
    reasoningEffort,
    setModelOptionKey: selectModelOption,
    setReasoningEffort: selectReasoningEffort,
  };
}
