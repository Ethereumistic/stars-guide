import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RateLimitState {
    usernameCheckCount: number;
    usernameCheckResetAt: number;
    recordUsernameCheck: () => boolean;
    canCheckUsername: () => boolean;
    getRemainingTime: () => number;
    resetUsernameCheck: () => void;
}

const MAX_CHECKS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export const useRateLimitStore = create<RateLimitState>()(
    persist(
        (set, get) => ({
            usernameCheckCount: 0,
            usernameCheckResetAt: 0,

            recordUsernameCheck: () => {
                const now = Date.now();
                const { usernameCheckCount, usernameCheckResetAt } = get();

                if (now > usernameCheckResetAt) {
                    set({
                        usernameCheckCount: 1,
                        usernameCheckResetAt: now + WINDOW_MS,
                    });
                    return true;
                }

                if (usernameCheckCount >= MAX_CHECKS) {
                    return false;
                }

                set({
                    usernameCheckCount: usernameCheckCount + 1,
                });
                return true;
            },

            canCheckUsername: () => {
                const now = Date.now();
                const { usernameCheckCount, usernameCheckResetAt } = get();

                if (now > usernameCheckResetAt) {
                    return true;
                }

                return usernameCheckCount < MAX_CHECKS;
            },

            getRemainingTime: () => {
                const now = Date.now();
                const { usernameCheckResetAt } = get();

                if (now > usernameCheckResetAt) {
                    return 0;
                }

                return Math.ceil((usernameCheckResetAt - now) / 1000);
            },

            resetUsernameCheck: () => {
                set({
                    usernameCheckCount: 0,
                    usernameCheckResetAt: 0,
                });
            },
        }),
        {
            name: 'rate-limit-storage',
        }
    )
);
