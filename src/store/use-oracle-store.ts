import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey } from "@/lib/oracle/features";

export type OracleState =
    | "idle"
    | "template_selection"
    | "follow_up_collection"
    | "oracle_responding"
    | "conversation_active";

export interface OracleMessage {
    role: "user" | "assistant" | "follow_up_prompt";
    content: string;
    createdAt: number;
    modelUsed?: string;
    fallbackTierUsed?: string;
}

export interface FollowUpData {
    _id: Id<"oracle_follow_ups">;
    questionText: string;
    questionType: string;
    contextLabel: string;
    displayOrder: number;
    isRequired: boolean;
    placeholder?: string;
    conditionalOnFollowUpId?: Id<"oracle_follow_ups">;
    conditionalOnValue?: string;
    options: {
        _id: Id<"oracle_follow_up_options">;
        label: string;
        value: string;
        displayOrder: number;
    }[];
}

interface OracleStore {
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;
    selectedCategorySlug: string | null;
    selectedCategoryId: Id<"oracle_categories"> | null;
    selectedTemplateId: Id<"oracle_templates"> | null;
    selectedTemplateRequiresThirdParty: boolean;
    selectedFeatureKey: OracleFeatureKey | null;
    pendingQuestion: string;
    followUps: FollowUpData[];
    currentFollowUpIndex: number;
    followUpAnswers: Record<string, string>;
    messages: OracleMessage[];
    streamingContent: string;
    isStreaming: boolean;
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;
    selectCategory: (slug: string, id: Id<"oracle_categories">) => void;
    deselectCategory: () => void;
    selectTemplate: (templateId: Id<"oracle_templates">, questionText: string, requiresThirdParty: boolean) => void;
    setSelectedFeature: (featureKey: OracleFeatureKey | null) => void;
    clearSelectedFeature: () => void;
    hydrateSessionFeature: (featureKey: OracleFeatureKey | null) => void;
    setPendingQuestion: (text: string) => void;
    startFollowUpCollection: (followUps: FollowUpData[]) => void;
    answerFollowUp: (followUpId: string, answer: string) => void;
    skipFollowUp: (followUpId: string) => void;
    advanceFollowUp: () => void;
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
    selectedCategorySlug: null,
    selectedCategoryId: null,
    selectedTemplateId: null,
    selectedTemplateRequiresThirdParty: false,
    selectedFeatureKey: null,
    pendingQuestion: "",
    followUps: [],
    currentFollowUpIndex: 0,
    followUpAnswers: {},
    messages: [],
    streamingContent: "",
    isStreaming: false,
    quotaRemaining: null,
    quotaResetAt: null,
    quotaExhausted: false,

    selectCategory: (slug, id) =>
        set({
            selectedCategorySlug: slug,
            selectedCategoryId: id,
            state: "template_selection",
            selectedTemplateId: null,
            selectedTemplateRequiresThirdParty: false,
            pendingQuestion: "",
        }),

    deselectCategory: () =>
        set({
            selectedCategorySlug: null,
            selectedCategoryId: null,
            selectedTemplateId: null,
            selectedTemplateRequiresThirdParty: false,
            pendingQuestion: "",
            state: "idle",
        }),

    selectTemplate: (templateId, questionText, requiresThirdParty) =>
        set({
            selectedTemplateId: templateId,
            selectedTemplateRequiresThirdParty: requiresThirdParty,
            pendingQuestion: questionText,
        }),

    setSelectedFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    clearSelectedFeature: () => set({ selectedFeatureKey: null }),

    hydrateSessionFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    setPendingQuestion: (text) => set({ pendingQuestion: text }),

    startFollowUpCollection: (followUps) =>
        set({
            state: "follow_up_collection",
            followUps,
            currentFollowUpIndex: 0,
            followUpAnswers: {},
        }),

    answerFollowUp: (followUpId, answer) =>
        set((state) => ({
            followUpAnswers: {
                ...state.followUpAnswers,
                [followUpId]: answer,
            },
        })),

    skipFollowUp: (followUpId) =>
        set((state) => ({
            followUpAnswers: {
                ...state.followUpAnswers,
                [followUpId]: "__skipped__",
            },
        })),

    advanceFollowUp: () => {
        const { currentFollowUpIndex, followUps } = get();
        if (currentFollowUpIndex < followUps.length - 1) {
            set({ currentFollowUpIndex: currentFollowUpIndex + 1 });
        }
    },

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
            selectedCategorySlug: null,
            selectedCategoryId: null,
            selectedTemplateId: null,
            selectedTemplateRequiresThirdParty: false,
            selectedFeatureKey: null,
            pendingQuestion: "",
            followUps: [],
            currentFollowUpIndex: 0,
            followUpAnswers: {},
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
