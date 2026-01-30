"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { getZodiacSignByDate } from "@/utils/zodiac"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

export function BirthDateStep() {
    const { birthDate, setBirthDate, nextStep } = useOnboardingStore()

    // Initialize with store values or defaults (2000-01-01)
    const [day, setDay] = React.useState(birthDate?.day || 1)
    const [month, setMonth] = React.useState(birthDate?.month || 1) // 1-indexed
    const [year, setYear] = React.useState(birthDate?.year || 2000)

    const daysInMonth = new Date(year, month, 0).getDate()

    // Ensure day is valid when month/year changes
    React.useEffect(() => {
        if (day > daysInMonth) {
            setDay(daysInMonth)
        }
    }, [month, year, day, daysInMonth])

    const sunSign = getZodiacSignByDate(month, day)

    const handleContinue = () => {
        setBirthDate({ day, month, year })
        nextStep()
    }

    // Generate years: 1920 to 2015, sorted with 2000 near the top/middle if possible
    // But mostly we just need 2000 to be easily reachable.
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 110 }, (_, i) => currentYear - 5 - i)

    // Days array
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-serif tracking-tight">When were you born?</h2>
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Every journey begins with a first breath.</p>
            </div>

            <div className="flex flex-col items-center space-y-8">
                {/* Custom 3-Column Picker */}
                <div className="relative w-full max-w-sm flex items-center justify-center bg-background/30 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden h-64 shadow-2xl">
                    {/* Highlight Overlay */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-primary/10 border-y border-primary/20 pointer-events-none" />

                    {/* Fading Edges */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-background via-background/50 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />

                    <div className="flex w-full h-full relative z-0">
                        {/* Day Column */}
                        <ScrollColumn
                            items={days}
                            value={day}
                            onSelect={(val) => setDay(Number(val))}
                            className="w-1/4"
                        />

                        {/* Month Column */}
                        <ScrollColumn
                            items={MONTHS}
                            value={MONTHS[month - 1]}
                            onSelect={(val) => setMonth(MONTHS.indexOf(val as string) + 1)}
                            className="w-1/2"
                        />

                        {/* Year Column */}
                        <ScrollColumn
                            items={years}
                            value={year}
                            onSelect={(val) => setYear(Number(val))}
                            className="w-1/4"
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {sunSign && (
                        <motion.div
                            key={sunSign.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                            className="p-6 border border-primary/20 bg-primary/5 rounded-2xl flex items-center gap-6 w-full relative overflow-hidden group"
                        >
                            <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-700">
                                <sunSign.icon size={120} />
                            </div>

                            <div className="text-6xl text-primary animate-pulse-slow">
                                <sunSign.icon />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">Sun Sign Revealed</p>
                                <p className="text-2xl font-serif">
                                    You're a <strong>{sunSign.name} {sunSign.symbol}</strong>
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 font-light italic leading-relaxed">
                                    {sunSign.traits}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    className="group px-8 rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300"
                    onClick={handleContinue}
                >
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}

interface ScrollColumnProps {
    items: (string | number)[]
    value: string | number
    onSelect: (value: string | number) => void
    className?: string
}

function ScrollColumn({ items, value, onSelect, className }: ScrollColumnProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Scroll to the selected item on mount and value changes
    React.useEffect(() => {
        const activeItem = scrollRef.current?.querySelector(`[data-active="true"]`)
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [value])

    return (
        <div
            ref={scrollRef}
            className={cn(
                "h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[100px] flex flex-col items-center no-scrollbar",
                className
            )}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            {items.map((item) => {
                const isActive = item === value
                return (
                    <div
                        key={item}
                        data-active={isActive}
                        className={cn(
                            "h-14 shrink-0 flex items-center justify-center snap-center cursor-pointer transition-all duration-300 w-full px-2",
                            isActive
                                ? "text-primary font-bold text-2xl scale-110"
                                : "text-muted-foreground/30 text-lg hover:text-muted-foreground/60"
                        )}
                        onClick={() => onSelect(item)}
                    >
                        {item}
                    </div>
                )
            })}
            {/* Spacer for bottom scrolling */}
            <div className="h-[100px] shrink-0 pointer-events-none" />
        </div>
    )
}

