import { create } from "zustand";
import { Doc } from "../../convex/_generated/dataModel";

interface UserState {
    user: Doc<"users"> | null | undefined;
    isLoading: boolean;
    setUser: (user: Doc<"users"> | null | undefined) => void;

    // Computed logic
    isAuthenticated: () => boolean;
    needsOnboarding: () => boolean;
    isPremium: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
    user: undefined, // undefined means checking, null means logged out
    isLoading: true,

    setUser: (user) => set({ user, isLoading: false }),

    isAuthenticated: () => !!get().user,

    needsOnboarding: () => {
        const user = get().user;
        if (!user) return false;
        return !user.birthData;
    },

    isPremium: () => {
        const user = get().user;
        if (!user) return false;
        return user.tier !== "free";
    },
}));
