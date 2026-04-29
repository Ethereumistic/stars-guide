import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey } from "@/lib/oracle/features";
import { detectTimezone } from "@/lib/timezone";

export type OracleState =
    | "idle"
    | "oracle_responding"
    | "conversation_active";

/** Timing metrics returned from the server */
export interface TimingMetrics {
    promptBuildMs: number;
    requestQueueMs: number;
    ttftMs: number;
    initialDecodeMs: number;
    totalMs: number;
}

/** Debug model override specification */
export interface DebugModelOverride {
    providerId: string;
    model: string;
}

interface OracleStore {
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;
    selectedFeatureKey: OracleFeatureKey | null;
    pendingQuestion: string;
    isStreaming: boolean;
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;
    timezone: string;

    // ── Debug state ──
    debugOpen: boolean;
    debugModelOverride: DebugModelOverride | null;
    debugLastMetrics: TimingMetrics | null;
    debugDebugModelUsed: string | null;
    debugClientTiming: {
        requestStartMs: number | null;
        firstContentMs: number | null;
        completeMs: number | null;
    };
    debugPromptTokens: number | null;
    debugCompletionTokens: number | null;

    setSelectedFeature: (featureKey: OracleFeatureKey | null) => void;
    clearSelectedFeature: () => void;
    hydrateSessionFeature: (featureKey: OracleFeatureKey | null) => void;
    setPendingQuestion: (text: string) => void;
    setOracleResponding: () => void;
    setIsStreaming: (streaming: boolean) => void;
    setSessionId: (id: Id<"oracle_sessions">) => void;
    setConversationActive: () => void;
    setQuota: (remaining: number | null, resetAt: number | null) => void;
    setTimezone: (tz: string) => void;
    resetToIdle: () => void;

    // ── Debug actions ──
    setDebugOpen: (open: boolean) => void;
    setDebugModelOverride: (override: DebugModelOverride | null) => void;
    setDebugLastMetrics: (metrics: TimingMetrics | null) => void;
    setDebugDebugModelUsed: (model: string | null) => void;
    setDebugClientTiming: (timing: {
        requestStartMs: number | null;
        firstContentMs: number | null;
        completeMs: number | null;
    }) => void;
    setDebugPromptTokens: (tokens: number | null) => void;
    setDebugCompletionTokens: (tokens: number | null) => void;
}

export const useOracleStore = create<OracleStore>((set, get) => ({
    sessionId: null,
    state: "idle",
    selectedFeatureKey: null,
    pendingQuestion: "",
    isStreaming: false,
    quotaRemaining: null,
    quotaResetAt: null,
    quotaExhausted: false,
    timezone: typeof window !== "undefined" ? detectTimezone() : "UTC",

    // ── Debug state defaults ──
    debugOpen: true,
    debugModelOverride: null,
    debugLastMetrics: null,
    debugDebugModelUsed: null,
    debugClientTiming: {
        requestStartMs: null,
        firstContentMs: null,
        completeMs: null,
    },
    debugPromptTokens: null,
    debugCompletionTokens: null,

    setSelectedFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    clearSelectedFeature: () => set({ selectedFeatureKey: null }),

    hydrateSessionFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    setPendingQuestion: (text) => set({ pendingQuestion: text }),

    setOracleResponding: () => set({ state: "oracle_responding" }),

    setIsStreaming: (streaming) => set({ isStreaming: streaming }),

    setSessionId: (id) => set({ sessionId: id }),

    setConversationActive: () => set({ state: "conversation_active" }),

    setQuota: (remaining, resetAt) =>
        set({
            quotaRemaining: remaining,
            quotaResetAt: resetAt,
            quotaExhausted: remaining !== null && remaining <= 0,
        }),

    setTimezone: (tz: string) => set({ timezone: tz }),

    resetToIdle: () =>
        set({
            sessionId: null,
            state: "idle",
            selectedFeatureKey: null,
            pendingQuestion: "",
            isStreaming: false,
        }),

    // ── Debug actions ──
    setDebugOpen: (open) => set({ debugOpen: open }),
    setDebugModelOverride: (override) => set({ debugModelOverride: override }),
    setDebugLastMetrics: (metrics) => set({ debugLastMetrics: metrics }),
    setDebugDebugModelUsed: (model) => set({ debugDebugModelUsed: model }),
    setDebugClientTiming: (timing) => set({ debugClientTiming: timing }),
    setDebugPromptTokens: (tokens) => set({ debugPromptTokens: tokens }),
    setDebugCompletionTokens: (tokens) => set({ debugCompletionTokens: tokens }),
}));