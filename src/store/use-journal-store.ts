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
    // Entry type for composer
    entryType: EntryType;
    setEntryType: (type: EntryType) => void;

    // Composer transient state
    isComposing: boolean;
    setIsComposing: (v: boolean) => void;

    // Active view
    activeView: "timeline" | "calendar" | "search" | "stats";
    setActiveView: (view: JournalStore["activeView"]) => void;

    // Voice
    isRecording: boolean;
    interimTranscript: string;
    finalTranscript: string;
    setRecording: (v: boolean) => void;
    setInterimTranscript: (text: string) => void;
    setFinalTranscript: (text: string) => void;

    // Search
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchFilters: JournalSearchFilters;
    setSearchFilters: (filters: Partial<JournalSearchFilters>) => void;
    resetSearchFilters: () => void;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
    entryType: "freeform",
    setEntryType: (entryType) => set({ entryType }),

    isComposing: false,
    setIsComposing: (isComposing) => set({ isComposing }),

    activeView: "timeline",
    setActiveView: (activeView) => set({ activeView }),

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
}));