import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Oracle State Machine
 * 
 * States: IDLE → TEMPLATE_SELECTION → FOLLOW_UP_COLLECTION → ORACLE_RESPONDING → CONVERSATION_ACTIVE
 * See PHASE5_FRONTEND.md §2
 */
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
    // ─── Routing / Session ────────────────────────────────────────────
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;

    // ─── Category + Template ──────────────────────────────────────────
    selectedCategorySlug: string | null;
    selectedCategoryId: Id<"oracle_categories"> | null;
    selectedTemplateId: Id<"oracle_templates"> | null;
    selectedTemplateRequiresThirdParty: boolean;
    pendingQuestion: string;

    // ─── Follow-up flow ───────────────────────────────────────────────
    followUps: FollowUpData[];
    currentFollowUpIndex: number;
    followUpAnswers: Record<string, string>; // followUpId → answer

    // ─── Messages ─────────────────────────────────────────────────────
    messages: OracleMessage[];
    streamingContent: string;
    isStreaming: boolean;

    // ─── Quota ─────────────────────────────────────────────────────────
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;

    // ─── Actions ──────────────────────────────────────────────────────
    selectCategory: (slug: string, id: Id<"oracle_categories">) => void;
    deselectCategory: () => void;
    selectTemplate: (templateId: Id<"oracle_templates">, questionText: string, requiresThirdParty: boolean) => void;
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
    // ─── Initial State ────────────────────────────────────────────────
    sessionId: null,
    state: "idle",
    selectedCategorySlug: null,
    selectedCategoryId: null,
    selectedTemplateId: null,
    selectedTemplateRequiresThirdParty: false,
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

    // ─── Actions ──────────────────────────────────────────────────────

    selectCategory: (slug, id) =>
        set({
            selectedCategorySlug: slug,
            selectedCategoryId: id,
            state: "template_selection",
            // Reset template selection when changing category
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
