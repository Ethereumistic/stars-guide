import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey } from "@/lib/oracle/features";

export type OracleState =
    | "idle"
    | "oracle_responding"
    | "conversation_active";

export interface OracleMessage {
    role: "user" | "assistant";
    content: string;
    createdAt: number;
    modelUsed?: string;
    fallbackTierUsed?: string;
}

interface OracleStore {
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;
    selectedFeatureKey: OracleFeatureKey | null;
    pendingQuestion: string;
    messages: OracleMessage[];
    streamingContent: string;
    isStreaming: boolean;
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;
    setSelectedFeature: (featureKey: OracleFeatureKey | null) => void;
    clearSelectedFeature: () => void;
    hydrateSessionFeature: (featureKey: OracleFeatureKey | null) => void;
    setPendingQuestion: (text: string) => void;
    setOracleResponding: () => void;
    setStreamingContent: (content: string) => void;
    setIsStreaming: (streaming: boolean) => void;
    addMessage: (message: OracleMessage) => void;
    setSessionId: (id: Id<"oracle_sessions">) => void;
    setConversationActive: () => void;
    setQuota: (remaining: number | null, resetAt: number | null) => void;
    resetToIdle: () => void;
    loadSession: (sessionId: Id<"oracle_sessions">, messages: OracleMessage[]) => void;
}

export const useOracleStore = create<OracleStore>((set, get) => ({
    sessionId: null,
    state: "idle",
    selectedFeatureKey: null,
    pendingQuestion: "",
    messages: [],
    streamingContent: "",
    isStreaming: false,
    quotaRemaining: null,
    quotaResetAt: null,
    quotaExhausted: false,

    setSelectedFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    clearSelectedFeature: () => set({ selectedFeatureKey: null }),

    hydrateSessionFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    setPendingQuestion: (text) => set({ pendingQuestion: text }),

    setOracleResponding: () => set({ state: "oracle_responding" }),

    setStreamingContent: (content) => set({ streamingContent: content }),

    setIsStreaming: (streaming) => set({ isStreaming: streaming }),

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
            streamingContent: "",
        })),

    setSessionId: (id) => set({ sessionId: id }),

    setConversationActive: () => set({ state: "conversation_active" }),

    setQuota: (remaining, resetAt) =>
        set({
            quotaRemaining: remaining,
            quotaResetAt: resetAt,
            quotaExhausted: remaining !== null && remaining <= 0,
        }),

    resetToIdle: () =>
        set({
            sessionId: null,
            state: "idle",
            selectedFeatureKey: null,
            pendingQuestion: "",
            messages: [],
            streamingContent: "",
            isStreaming: false,
        }),

    loadSession: (sessionId, messages) =>
        set({
            sessionId,
            state: "conversation_active",
            messages,
            streamingContent: "",
            isStreaming: false,
        }),
}));