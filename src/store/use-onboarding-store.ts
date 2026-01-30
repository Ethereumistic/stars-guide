import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Location {
    lat: number;
    long: number;
    city: string;
    country: string;
}

export interface BirthDate {
    month: number;
    day: number;
    year: number;
}

interface OnboardingState {
    // Current step (0-7)
    step: number;

    // Birth data
    birthDate: BirthDate | null;
    birthLocation: Location | null;
    birthTimeKnown: boolean | null;
    birthTime: string | null; // "14:30" format
    birthTimeConfidence: 'high' | 'medium' | 'low' | null;

    // Unknown time path
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown' | null;
    detectiveAnswers: Record<string, string>;

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
    setBirthLocation: (location: Location) => void;
    setBirthTimeKnown: (known: boolean) => void;
    setBirthTime: (time: string) => void;
    setBirthTimeConfidence: (confidence: 'high' | 'medium' | 'low') => void;

    setTimeOfDay: (timeOfDay: NonNullable<OnboardingState['timeOfDay']>) => void;
    setDetectiveAnswer: (questionId: string, answer: string) => void;

    setCalculatedSigns: (signs: OnboardingState['calculatedSigns']) => void;

    // Utility
    isComplete: () => boolean;
    reset: () => void;
}

const initialState = {
    step: 0,
    birthDate: null,
    birthLocation: null,
    birthTimeKnown: null,
    birthTime: null,
    birthTimeConfidence: null,
    timeOfDay: null,
    detectiveAnswers: {},
    calculatedSigns: null,
};

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // Step navigation
            setStep: (step) => set({ step }),
            nextStep: () => set((state) => ({ step: state.step + 1 })),
            prevStep: () => set((state) => ({ step: Math.max(0, state.step - 1) })),

            // Birth data setters
            setBirthDate: (birthDate) => set({ birthDate }),
            setBirthLocation: (birthLocation) => set({ birthLocation }),
            setBirthTimeKnown: (birthTimeKnown) => set({ birthTimeKnown }),
            setBirthTime: (birthTime) => set({ birthTime }),
            setBirthTimeConfidence: (birthTimeConfidence) => set({ birthTimeConfidence }),

            // Unknown time path
            setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
            setDetectiveAnswer: (questionId, answer) =>
                set((state) => ({
                    detectiveAnswers: { ...state.detectiveAnswers, [questionId]: answer },
                })),

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
                birthTimeConfidence: state.birthTimeConfidence,
                timeOfDay: state.timeOfDay,
                detectiveAnswers: state.detectiveAnswers,
            }),
        }
    )
);

// Computed helpers
export const useOnboardingProgress = () => {
    const { step, birthDate, birthLocation, birthTimeKnown, birthTime } =
        useOnboardingStore();

    const totalSteps = 7;
    const completedSteps = [
        !!birthDate,
        !!birthLocation,
        birthTimeKnown !== null,
        birthTimeKnown ? !!birthTime : (step >= 6),
    ].filter(Boolean).length;

    return {
        currentStep: step,
        totalSteps,
        progress: (completedSteps / totalSteps) * 100,
    };
};
