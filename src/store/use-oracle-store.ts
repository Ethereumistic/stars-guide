import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey, BirthChartDepth } from "@/lib/oracle/features";
import type { StoredBirthData } from "@/lib/birth-chart/types";
import { detectTimezone } from "@/lib/timezone";

export type OracleState =
    | "idle"
    | "conversation_active";

/** Debug model override specification */
export interface DebugModelOverride {
    providerId: string;
    model: string;
}

/** Synastry state — Chart B data + relationship type */
export interface SynastryState {
    chartB: StoredBirthData | null;
    chartBName: string;
    source: "friend" | "custom" | null;
    friendUserId?: string;
    relationship: string | null;
    relationshipCategory: string | null;
}

interface OracleStore {
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;
    selectedFeatureKey: OracleFeatureKey | null;
    birthChartDepth: BirthChartDepth;
    pendingQuestion: string;
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;
    timezone: string;
    synastryData: SynastryState | null;
    usageOpen: boolean;
    upgradeOpen: boolean;

    // ── Debug state ──
    debugOpen: boolean;
    debugModelOverride: DebugModelOverride | null;
    debugClientTiming: {
        requestStartMs: number | null;
        firstContentMs: number | null;
        completeMs: number | null;
    };

    setSelectedFeature: (featureKey: OracleFeatureKey | null) => void;
    setBirthChartDepth: (depth: BirthChartDepth) => void;
    clearSelectedFeature: () => void;
    hydrateSessionFeature: (featureKey: OracleFeatureKey | null) => void;
    setPendingQuestion: (text: string) => void;
    setSessionId: (id: Id<"oracle_sessions">) => void;
    setConversationActive: () => void;
    setQuota: (remaining: number | null, resetAt: number | null) => void;
    setTimezone: (tz: string) => void;
    resetToIdle: () => void;
    setSynastryChartB: (data: StoredBirthData, name: string, source: "friend" | "custom", friendUserId?: string) => void;
    setSynastryRelationship: (relationship: string, category?: string) => void;
    clearSynastry: () => void;
    clearSynastryChartB: () => void;
    setUsageOpen: (open: boolean) => void;
    setUpgradeOpen: (open: boolean) => void;

    // ── Debug actions ──
    setDebugOpen: (open: boolean) => void;
    setDebugModelOverride: (override: DebugModelOverride | null) => void;
    setDebugClientTiming: (timing: {
        requestStartMs: number | null;
        firstContentMs: number | null;
        completeMs: number | null;
    }) => void;
}

export const useOracleStore = create<OracleStore>((set) => ({
    sessionId: null,
    state: "idle",
    selectedFeatureKey: null,
    birthChartDepth: "core",
    pendingQuestion: "",
    quotaRemaining: null,
    quotaResetAt: null,
    quotaExhausted: false,
    timezone: typeof window !== "undefined" ? detectTimezone() : "UTC",
    synastryData: null,
    usageOpen: false,
    upgradeOpen: false,

    // ── Debug state defaults ──
    debugOpen: true,
    debugModelOverride: null,
    debugClientTiming: {
        requestStartMs: null,
        firstContentMs: null,
        completeMs: null,
    },

    setSelectedFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),

    setBirthChartDepth: (depth) => set({ birthChartDepth: depth }),

    clearSelectedFeature: () => set({ selectedFeatureKey: null, synastryData: null }),

    hydrateSessionFeature: (featureKey) => set({ selectedFeatureKey: featureKey, birthChartDepth: "core" }),

    setPendingQuestion: (text) => set({ pendingQuestion: text }),

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
            birthChartDepth: "core",
            pendingQuestion: "",
            synastryData: null,
        }),

    setSynastryChartB: (data, name, source, friendUserId) =>
        set((state) => ({
            synastryData: {
                ...(state.synastryData ?? { chartB: null, chartBName: "", source: null, relationship: null, relationshipCategory: null }),
                chartB: data,
                chartBName: name,
                source,
                ...(friendUserId ? { friendUserId } : {}),
            },
        })),

    setSynastryRelationship: (relationship, category) =>
        set((state) => ({
            synastryData: {
                ...(state.synastryData ?? { chartB: null, chartBName: "", source: null, relationship: null, relationshipCategory: null }),
                relationship,
                ...(category != null ? { relationshipCategory: category } : {}),
            },
        })),

    clearSynastry: () => set({ synastryData: null }),

    clearSynastryChartB: () =>
        set((state) => ({
            synastryData: state.synastryData
                ? { ...state.synastryData, chartB: null, chartBName: "", source: null, friendUserId: undefined }
                : null,
        })),

    setUsageOpen: (open) => set({ usageOpen: open }),
    setUpgradeOpen: (open) => set({ upgradeOpen: open }),

    // ── Debug actions ──
    setDebugOpen: (open) => set({ debugOpen: open }),
    setDebugModelOverride: (override) => set({ debugModelOverride: override }),
    setDebugClientTiming: (timing) => set({ debugClientTiming: timing }),
}));
