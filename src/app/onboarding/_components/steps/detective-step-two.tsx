"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

const detectiveQuestions = [
    {
        id: "first_impression",
        text: "What are you usually like when people first meet you?",
        options: [
            { value: "aries", label: "Bold, direct, energetic, or ready to lead" },
            { value: "taurus", label: "Calm, steady, sensual, or naturally reliable" },
            { value: "gemini", label: "Quick-witted, youthful, or always curious" },
            { value: "cancer", label: "Soft, empathetic, or emotional warmth" },
            { value: "leo", label: "Charismatic, dramatic, or loves the spotlight" },
            { value: "virgo", label: "Practical, detail-oriented, or helpful" },
            { value: "libra", label: "Charming, diplomatic, or artistic/social" },
            { value: "scorpio", label: "Intense, magnetic, or a powerful presence" },
            { value: "sagittarius", label: "Optimistic, adventurous, or philosophical" },
            { value: "capricorn", label: "Ambitious, serious, or a mature vibe" },
            { value: "aquarius", label: "Unique, eccentric, or innovative" },
            { value: "pisces", label: "Dreamy, compassionate, or artistic/elusive" },
        ]
    },
    {
        id: "physical_vibe",
        text: "How would you describe your look or overall vibe?",
        options: [
            { value: "aries", label: "Sharp features, athletic build, or bold energy" },
            { value: "taurus", label: "Rounded face, strong neck, or earthy style" },
            { value: "gemini", label: "Slender, expressive face, or youthful look" },
            { value: "cancer", label: "Soft face, big eyes, or a comforting aura" },
            { value: "leo", label: "Striking hair, regal posture, or confident flair" },
            { value: "virgo", label: "Neat bone structure, classic, or polished" },
            { value: "libra", label: "Symmetrical, elegant, or harmonious" },
            { value: "scorpio", label: "Piercing eyes, mysterious, or transformative" },
            { value: "sagittarius", label: "Tall/open build, casual, or big smile" },
            { value: "capricorn", label: "Edgy cheekbones, serious, or timeless style" },
            { value: "aquarius", label: "Unusual features, futuristic, or eclectic" },
            { value: "pisces", label: "Fluid movements, ethereal, or gentle" },
        ]
    },
    {
        id: "approach",
        text: "How do you usually handle new situations or challenges?",
        options: [
            { value: "aries", label: "Dive in headfirst, action-oriented" },
            { value: "taurus", label: "Build slowly for security, steady pace" },
            { value: "gemini", label: "Explore options, adapt quickly, multitask" },
            { value: "cancer", label: "Feel it emotionally, protect self & others" },
            { value: "leo", label: "Make it creative, lead with heart & pride" },
            { value: "virgo", label: "Analyze details, work hard & improve" },
            { value: "libra", label: "Seek balance, compromise & harmonize" },
            { value: "scorpio", label: "Probe deeply, strategize, transform" },
            { value: "sagittarius", label: "Go big/optimistic, seek adventure" },
            { value: "capricorn", label: "Plan ambitiously, climb steadily toward goals" },
            { value: "aquarius", label: "Innovate/rebel, do it independently" },
            { value: "pisces", label: "Flow intuitively, avoid direct conflict" },
        ]
    }
]

export function DetectiveStepTwo() {
    const {
        detectiveAnswers,
        setDetectiveAnswer,
        setStep,
        prevStep,
        detectiveQuestionIndex,
        setDetectiveQuestionIndex
    } = useOnboardingStore()

    const currentQuestion = detectiveQuestions[detectiveQuestionIndex]
    const isLastQuestion = detectiveQuestionIndex === detectiveQuestions.length - 1
    const currentAnswer = detectiveAnswers[currentQuestion.id]

    const handleNext = () => {
        if (!currentAnswer) return

        if (isLastQuestion) {
            setStep(7)
        } else {
            setDetectiveQuestionIndex(detectiveQuestionIndex + 1)
        }
    }

    const handleBack = () => {
        if (detectiveQuestionIndex === 0) {
            prevStep()
        } else {
            setDetectiveQuestionIndex(detectiveQuestionIndex - 1)
        }
    }

    return (
        <div className="max-w-md md:max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif leading-tight">
                    {currentQuestion.text}
                </h2>
                <div className="flex justify-center gap-1">
                    {detectiveQuestions.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 w-8 rounded-full transition-colors ${idx === detectiveQuestionIndex ? 'bg-primary' : idx < detectiveQuestionIndex ? 'bg-primary/40' : 'bg-primary/10'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <RadioGroup
                    value={currentAnswer}
                    onValueChange={(val) => setDetectiveAnswer(currentQuestion.id, val)}
                    className=" grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 justify-center gap-3"
                >
                    {currentQuestion.options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => setDetectiveAnswer(currentQuestion.id, opt.value)}
                            className={`group flex items-center justify-center text-center 
                                        px-4 py-3 border rounded-md bg-background/30 cursor-pointer 
                                        transition-all hover:bg-primary/5 hover:border-primary/30 
                                        ${currentAnswer === opt.value ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-[0_0_25px_-5px_oklch(var(--primary)/0.4)] shadow-primary/40' : 'border-border'}`}
                        >
                            <RadioGroupItem
                                value={opt.value}
                                id={`${currentQuestion.id}-${opt.value}`}
                                className="sr-only"
                            />
                            <Label
                                htmlFor={`${currentQuestion.id}-${opt.value}`}
                                className="cursor-pointer text-base font-normal"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {opt.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>


            <div className="flex justify-between items-center pt-4 max-w-md mx-auto">
                <Button variant="outline" onClick={handleBack} className="text-muted-foreground">
                    <ChevronLeft className="size-5" />
                </Button>
                <Button
                    size="lg"
                    className="group px-8"
                    disabled={!currentAnswer}
                    onClick={handleNext}
                >
                    {isLastQuestion ? "See My Chart" : "Next Question"}
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}

