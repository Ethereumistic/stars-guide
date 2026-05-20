import { create } from "zustand";
import type { EntryType, MoodZone } from "@/lib/journal/constants";

interface JournalSearchFilters {
    moodZone?: MoodZone;
    entryType?: EntryType;
    tags?: string[];
    dateRange?: { start: string; end: string };
    moonPhase?: string;
}

interface JournalStore {
    // ── Tab state (reflects URL, but also controls tab) ──
    activeTab: "stream" | "calendar" | "search" | "insights" | "settings";
    setActiveTab: (tab: JournalStore["activeTab"]) => void;

    // ── Detail panel state ──
    activeEntryId: string | null;
    setActiveEntryId: (id: string | null) => void;
    isEditingEntry: boolean;
    setIsEditingEntry: (v: boolean) => void;

    // ── Voice input state (still global — recording can continue across views) ──
    isRecording: boolean;
    interimTranscript: string;
    finalTranscript: string;
    setRecording: (v: boolean) => void;
    setInterimTranscript: (text: string) => void;
    setFinalTranscript: (text: string) => void;

    // ── Search state (useful to persist across tab switches) ──
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchFilters: JournalSearchFilters;
    setSearchFilters: (filters: Partial<JournalSearchFilters>) => void;
    resetSearchFilters: () => void;

    // ── Legacy fields (kept for backward compatibility with EntryComposer) ──
    // These are used by the old /journal/[entryId]/edit page.
    // They will be removed once the detail panel (Phase 2) replaces it.
    entryType: EntryType;
    setEntryType: (type: EntryType) => void;
    isComposing: boolean;
    setIsComposing: (v: boolean) => void;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
    activeTab: "stream",
    setActiveTab: (activeTab) => set({ activeTab }),

    activeEntryId: null,
    setActiveEntryId: (activeEntryId) => set({ activeEntryId }),
    isEditingEntry: false,
    setIsEditingEntry: (isEditingEntry) => set({ isEditingEntry }),

    isRecording: false,
    interimTranscript: "",
    finalTranscript: "",
    setRecording: (isRecording) => set({ isRecording }),
    setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
    setFinalTranscript: (finalTranscript) => set({ finalTranscript }),

    searchQuery: "",
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    searchFilters: {},
    setSearchFilters: (filters) =>
        set({ searchFilters: { ...get().searchFilters, ...filters } }),
    resetSearchFilters: () => set({ searchFilters: {} }),

    // Legacy — kept for EntryComposer backward compatibility
    entryType: "freeform",
    setEntryType: (entryType) => set({ entryType }),
    isComposing: false,
    setIsComposing: (isComposing) => set({ isComposing }),
}));