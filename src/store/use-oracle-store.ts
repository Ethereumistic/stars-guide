import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey } from "@/lib/oracle/features";
import { detectTimezone } from "@/lib/timezone";

export type OracleState =
    | "idle"
    | "oracle_responding"
    | "conversation_active";

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
}));