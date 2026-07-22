"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { Id } from "@/../convex/_generated/dataModel";
import type { ReasoningEffort } from "@/lib/ai/inference-preferences";
import type { DebugModelOverride } from "@/store/use-oracle-store";
import type { OracleConversationTurn } from "../_types";

type TurnResult = {
  turnId: Id<"oracle_turns">;
  sessionId: Id<"oracle_sessions">;
  userMessageId: Id<"oracle_messages">;
  assistantMessageId: Id<"oracle_messages">;
  reused: boolean;
  existingActive: boolean;
};

const beginTurnRef = makeFunctionReference<"mutation", {
  sessionId: Id<"oracle_sessions">;
  content: string;
  clientRequestId: string;
  modelOptionKey?: string;
  reasoningEffort?: ReasoningEffort;
  timezone?: string;
  debugModelOverride?: DebugModelOverride;
}, TurnResult>("oracle/turns:beginTurn");

const requestStopRef = makeFunctionReference<"mutation", {
  turnId: Id<"oracle_turns">;
}, { status: string; changed: boolean }>("oracle/turns:requestStop");

const retryTurnRef = makeFunctionReference<"mutation", {
  turnId: Id<"oracle_turns">;
  clientRequestId: string;
  timezone?: string;
}, TurnResult>("oracle/turns:retryTurn");

const resumeIncompleteTurnRef = makeFunctionReference<"mutation", {
  turnId: Id<"oracle_turns">;
}, TurnResult & { missingSectionKeys: string[] }>("oracle/turns:resumeIncompleteTurn");

export function useOracleTurnController({
  sessionId,
  activeTurn,
  timezone,
  debugModelOverride,
}: {
  sessionId: Id<"oracle_sessions">;
  activeTurn: OracleConversationTurn | null;
  timezone: string;
  debugModelOverride: DebugModelOverride | null;
}) {
  const beginTurnMutation = useMutation(beginTurnRef);
  const requestStopMutation = useMutation(requestStopRef);
  const retryTurnMutation = useMutation(retryTurnRef);
  const resumeIncompleteTurnMutation = useMutation(resumeIncompleteTurnRef);
  const [beginMutationPending, setBeginMutationPending] = React.useState(false);
  const [stopMutationPending, setStopMutationPending] = React.useState(false);
  const [recoveryMutationPending, setRecoveryMutationPending] = React.useState(false);
  const [pendingContent, setPendingContent] = React.useState<string | null>(null);

  const begin = React.useCallback(async ({
    content,
    modelOptionKey,
    reasoningEffort,
  }: {
    content: string;
    modelOptionKey?: string;
    reasoningEffort?: ReasoningEffort;
  }) => {
    if (activeTurn || beginMutationPending) return null;
    setBeginMutationPending(true);
    setPendingContent(content);
    try {
      const result = await beginTurnMutation({
        sessionId,
        content,
        clientRequestId: crypto.randomUUID(),
        modelOptionKey,
        reasoningEffort,
        timezone,
        ...(debugModelOverride ? { debugModelOverride } : {}),
      });
      if (result.existingActive) setPendingContent(null);
      return result;
    } catch (error) {
      setPendingContent(null);
      throw error;
    } finally {
      setBeginMutationPending(false);
    }
  }, [activeTurn, beginMutationPending, beginTurnMutation, debugModelOverride, sessionId, timezone]);

  const stop = React.useCallback(async () => {
    if (!activeTurn || stopMutationPending) return;
    setStopMutationPending(true);
    try {
      await requestStopMutation({ turnId: activeTurn._id });
    } finally {
      setStopMutationPending(false);
    }
  }, [activeTurn, requestStopMutation, stopMutationPending]);

  const recover = React.useCallback(async (turn: OracleConversationTurn) => {
    if (activeTurn || recoveryMutationPending) return null;
    setRecoveryMutationPending(true);
    try {
      if (turn.status === "incomplete" && turn.publicationMode === "validated_sections") {
        return await resumeIncompleteTurnMutation({ turnId: turn._id });
      }
      return await retryTurnMutation({
        turnId: turn._id,
        clientRequestId: crypto.randomUUID(),
        timezone,
      });
    } finally {
      setRecoveryMutationPending(false);
    }
  }, [activeTurn, recoveryMutationPending, resumeIncompleteTurnMutation, retryTurnMutation, timezone]);

  const clearPendingContent = React.useCallback(() => setPendingContent(null), []);

  return {
    begin,
    stop,
    recover,
    beginMutationPending,
    stopMutationPending,
    recoveryMutationPending,
    pendingContent,
    clearPendingContent,
    busy: Boolean(activeTurn) || beginMutationPending || recoveryMutationPending,
  };
}
