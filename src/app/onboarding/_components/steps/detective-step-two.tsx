"use client"

import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ChevronRight, Sparkles } from "lucide-react"

const detectiveQuestions = [
    {
        id: "first_impression",
        text: "How do people usually describe you when they first meet you?",
        options: [
            { value: "aries_leo", label: "Energetic and assertive" },
            { value: "taurus_capricorn", label: "Calm and grounded" },
            { value: "gemini_sagittarius", label: "Curious and chatty" },
            { value: "cancer_pisces", label: "Warm and nurturing" },
            { value: "scorpio", label: "Mysterious and intense" },
        ]
    },
    {
        id: "morning_routine",
        text: "Which describes your morning routine?",
        options: [
            { value: "fire", label: "Up early, ready to conquer" },
            { value: "earth", label: "Slow, sensory (coffee, shower)" },
            { value: "air", label: "Varied, depends on mood" },
            { value: "water", label: "Prefer sleeping in" },
        ]
    },
    {
        id: "stress_handle",
        text: "How do you handle stress?",
        options: [
            { value: "cardinal", label: "Take action immediately" },
            { value: "fixed", label: "Stay calm, ride it out" },
            { value: "mutable", label: "Adapt and pivot" },
        ]
    }
]

export function DetectiveStepTwo() {
    const { detectiveAnswers, setDetectiveAnswer, setStep, prevStep } = useOnboardingStore()

    const allAnswered = detectiveQuestions.every(q => detectiveAnswers[q.id])

    const handleContinue = () => {
        if (allAnswered) {
            setStep(7)
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">The Final Clues</h2>
                <p className="text-muted-foreground text-sm">Every trait is a cosmic fingerprint.</p>
            </div>

            <div className="space-y-8">
                {detectiveQuestions.map((q) => (
                    <div key={q.id} className="space-y-4">
                        <Label className="text-base font-medium leading-tight">{q.text}</Label>
                        <RadioGroup
                            value={detectiveAnswers[q.id]}
                            onValueChange={(val) => setDetectiveAnswer(q.id, val)}
                            className="space-y-2"
                        >
                            {q.options.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`flex items-center space-x-3 p-3 border bg-background/30 cursor-pointer hover:bg-primary/5 transition-colors ${detectiveAnswers[q.id] === opt.value ? 'border-primary bg-primary/10' : ''}`}
                                >
                                    <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} />
                                    <Label htmlFor={`${q.id}-${opt.value}`} className="flex-1 cursor-pointer py-1 font-normal">
                                        {opt.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                ))}
            </div>

            <div className="p-4 border bg-amber-500/5 flex gap-3 text-sm italic text-amber-200/60">
                <Sparkles className="size-5 shrink-0 text-amber-500/50" />
                <p>
                    We'll use these answers to estimate your rising sign.
                    It's educational, but won't be as accurate as an exact birth time.
                </p>
            </div>

            <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={prevStep}>
                    Back
                </Button>
                <Button
                    size="lg"
                    className="group"
                    disabled={!allAnswered}
                    onClick={handleContinue}
                >
                    See My Chart
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
