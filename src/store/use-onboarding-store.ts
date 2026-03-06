import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BirthLocation, EnrichedBirthData } from '@/lib/birth-chart/types';

export type Location = BirthLocation;

export interface BirthDate {
    month: number;
    day: number;
    year: number;
}

interface OnboardingState {
    step: number;
    birthDate: BirthDate | null;
    birthLocation: Location | null;
    birthTimeKnown: boolean | null;
    birthTime: string | null;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown' | null;
    detectiveAnswers: Record<string, string>;
    detectiveQuestionIndex: number;
    email: string | null;
    password: string | null;
    calculatedSigns: EnrichedBirthData | null;
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
            setStep: (step) => set({ step }),
            nextStep: () => set((state) => ({ step: state.step + 1 })),
            prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
            setBirthDate: (birthDate) => set({ birthDate }),
            setBirthLocation: (birthLocation) => set({ birthLocation }),
            setBirthTimeKnown: (birthTimeKnown) => set({ birthTimeKnown }),
            setBirthTime: (birthTime) => set({ birthTime }),
            setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
            setDetectiveAnswer: (questionId, answer) =>
                set((state) => ({
                    detectiveAnswers: { ...state.detectiveAnswers, [questionId]: answer },
                })),
            setDetectiveQuestionIndex: (index) => set({ detectiveQuestionIndex: index }),
            setEmail: (email) => set({ email }),
            setPassword: (password) => set({ password }),
            setCalculatedSigns: (calculatedSigns) => set({ calculatedSigns }),
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
            partialize: (state) => ({
                birthDate: state.birthDate,
                birthLocation: state.birthLocation,
                birthTimeKnown: state.birthTimeKnown,
                birthTime: state.birthTime,
                timeOfDay: state.timeOfDay,
                detectiveAnswers: state.detectiveAnswers,
                email: state.email,
            }),
        }
    )
);

export const useOnboardingProgress = () => {
    const { step, detectiveQuestionIndex } = useOnboardingStore();

    let progress = 0;

    switch (step) {
        case 1: progress = 0; break;
        case 2: progress = 33; break;
        case 3: progress = 66; break;
        case 4:
            progress = 90;
            break;
        case 5:
            progress = 70;
            break;
        case 6:
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

