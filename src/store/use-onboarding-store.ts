import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Location {
    lat: number;
    long: number;
    city: string;
    country: string;
    countryCode?: string;
}

export interface BirthDate {
    month: number;
    day: number;
    year: number;
}

interface OnboardingState {
    // Current step (0-9)
    step: number;

    // Birth data
    birthDate: BirthDate | null;
    birthLocation: Location | null;
    birthTimeKnown: boolean | null;
    birthTime: string | null; // "14:30" format

    // Unknown time path
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown' | null;
    detectiveAnswers: Record<string, string>;
    detectiveQuestionIndex: number;

    // User Account (for non-authenticated flow)
    email: string | null;
    password: string | null;

    // Calculated results (cached from Step 7)
    calculatedSigns: {
        sunSign: string;
        moonSign: string;
        risingSign: string;
    } | null;

    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;

    setBirthDate: (date: BirthDate) => void;
    setBirthLocation: (location: Location | null) => void;
    setBirthTimeKnown: (known: boolean) => void;
    setBirthTime: (time: string) => void;


    setTimeOfDay: (timeOfDay: NonNullable<OnboardingState['timeOfDay']>) => void;
    setDetectiveAnswer: (questionId: string, answer: string) => void;
    setDetectiveQuestionIndex: (index: number) => void;

    setEmail: (email: string) => void;
    setPassword: (password: string) => void;

    setCalculatedSigns: (signs: OnboardingState['calculatedSigns']) => void;

    // Utility
    isComplete: () => boolean;
    reset: () => void;
}

const initialState = {
    step: 1,
    birthDate: null,
    birthLocation: null,
    birthTimeKnown: null,
    birthTime: null,

    timeOfDay: null,
    detectiveAnswers: {},
    detectiveQuestionIndex: 0,
    email: null,
    password: null,
    calculatedSigns: null,
};

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // Step navigation
            setStep: (step) => set({ step }),
            nextStep: () => set((state) => ({ step: state.step + 1 })),
            prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),

            // Birth data setters
            setBirthDate: (birthDate) => set({ birthDate }),
            setBirthLocation: (birthLocation) => set({ birthLocation }),
            setBirthTimeKnown: (birthTimeKnown) => set({ birthTimeKnown }),
            setBirthTime: (birthTime) => set({ birthTime }),


            // Unknown time path
            setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
            setDetectiveAnswer: (questionId, answer) =>
                set((state) => ({
                    detectiveAnswers: { ...state.detectiveAnswers, [questionId]: answer },
                })),
            setDetectiveQuestionIndex: (index) => set({ detectiveQuestionIndex: index }),

            // Account data
            setEmail: (email) => set({ email }),
            setPassword: (password) => set({ password }),

            // Calculation results
            setCalculatedSigns: (calculatedSigns) => set({ calculatedSigns }),

            // Utility
            isComplete: () => {
                const state = get();
                return !!(
                    state.birthDate &&
                    state.birthLocation &&
                    (state.birthTime || state.timeOfDay)
                );
            },

            reset: () => set(initialState),
        }),
        {
            name: 'stars-guide-onboarding',
            // Only persist essential data, not UI state
            partialize: (state) => ({
                birthDate: state.birthDate,
                birthLocation: state.birthLocation,
                birthTimeKnown: state.birthTimeKnown,
                birthTime: state.birthTime,

                timeOfDay: state.timeOfDay,
                detectiveAnswers: state.detectiveAnswers,
                email: state.email,
                // Don't persist password for security reasons, even in localStore it's better not to
            }),
        }
    )
);

// Computed helpers
export const useOnboardingProgress = () => {
    const { step, birthTimeKnown, detectiveQuestionIndex } = useOnboardingStore();

    let progress = 0;

    switch (step) {
        case 1: progress = 0; break;
        case 2: progress = 33; break;
        case 3: progress = 66; break;
        case 4: // Birth Time Flow (YES)
            progress = 90;
            break;
        case 5: // Detective Flow (NO)
            progress = 70;
            break;
        case 6: // Detective Step Two
            if (detectiveQuestionIndex === 0) progress = 80;
            else if (detectiveQuestionIndex === 1) progress = 90;
            else if (detectiveQuestionIndex === 2) progress = 95;
            break;
        case 7:
        case 8:
        case 9:
            progress = 100;
            break;
        default: progress = 0;
    }

    return {
        currentStep: step,
        progress,
    };
};
