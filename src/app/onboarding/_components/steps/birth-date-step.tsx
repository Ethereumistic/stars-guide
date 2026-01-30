"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { getZodiacSignByDate } from "@/utils/zodiac"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight } from "lucide-react"

export function BirthDateStep() {
    const { birthDate, setBirthDate, nextStep } = useOnboardingStore()

    // Convert store date to JS Date for the Calendar
    const initialDate = birthDate
        ? new Date(birthDate.year, birthDate.month - 1, birthDate.day)
        : undefined

    const [date, setDate] = React.useState<Date | undefined>(initialDate)

    const sunSign = date
        ? getZodiacSignByDate(date.getMonth() + 1, date.getDate())
        : null

    const handleContinue = () => {
        if (date) {
            setBirthDate({
                month: date.getMonth() + 1,
                day: date.getDate(),
                year: date.getFullYear()
            })
            nextStep()
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">When were you born?</h2>
                <p className="text-muted-foreground text-sm">Every journey begins with a first breath.</p>
            </div>

            <div className="flex flex-col items-center space-y-6">
                <div className="border bg-background/50 backdrop-blur-sm p-4">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                    />
                </div>

                <AnimatePresence>
                    {sunSign && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="p-6 border flex items-center gap-6 w-full"
                        >
                            <div className="text-5xl text-primary">
                                <sunSign.icon />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-primary">Sun Sign Revealed</p>
                                <p className="text-lg">
                                    You're a <strong>{sunSign.name} {sunSign.symbol}</strong>
                                </p>
                                <p className="text-sm text-muted-foreground italic">
                                    "{sunSign.traits}"
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    className="group"
                    disabled={!date}
                    onClick={handleContinue}
                >
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
