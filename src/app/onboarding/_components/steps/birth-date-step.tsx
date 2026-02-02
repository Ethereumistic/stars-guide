"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
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

    const handleContinue = () => {
        setBirthDate({ day, month, year })
        nextStep()
    }

    // Generate years: 1920 to 2015, sorted with 2000 near the top/middle if possible
    // But mostly we just need 2000 to be easily reachable.
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 200 }, (_, i) => currentYear - i)

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
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    className="group"
                    onClick={handleContinue}
                >
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel"

interface ScrollColumnProps {
    items: (string | number)[]
    value: string | number
    onSelect: (value: string | number) => void
    className?: string
}

function ScrollColumn({ items, value, onSelect, className }: ScrollColumnProps) {
    const [api, setApi] = React.useState<CarouselApi>()

    // Synchronize initial value to Carousel
    React.useEffect(() => {
        if (!api) return
        const index = items.indexOf(value)
        if (index !== -1 && api.selectedScrollSnap() !== index) {
            api.scrollTo(index, true) // jump without animation on init
        }
    }, [api, items, value])

    // Handle selection from Carousel
    React.useEffect(() => {
        if (!api) return

        const handleSelect = () => {
            const index = api.selectedScrollSnap()
            const newValue = items[index]
            if (newValue !== value) {
                onSelect(newValue)
            }
        }

        api.on("select", handleSelect)
        return () => {
            api.off("select", handleSelect)
        }
    }, [api, items, onSelect, value])

    // Add Wheel Support
    const onWheel = React.useCallback((e: React.WheelEvent) => {
        if (!api) return
        if (e.deltaY > 0) {
            api.scrollNext()
        } else {
            api.scrollPrev()
        }
    }, [api])

    return (
        <div onWheel={onWheel} className={cn("h-full grow", className)}>
            <Carousel
                setApi={setApi}
                orientation="vertical"
                opts={{
                    align: "center",
                    containScroll: false,
                    dragFree: true, // Allows smooth momentum dragging
                    loop: true,
                }}
                className="w-full h-full"
            >
                <CarouselContent className="h-64 mt-0">
                    {items.map((item, index) => {
                        const isActive = item === value
                        return (
                            <CarouselItem
                                key={index}
                                className="pt-0 h-14 flex items-center justify-center grow-0 shrink-0 basis-14"
                            >
                                <div
                                    className={cn(
                                        "transition-all duration-300 select-none cursor-pointer",
                                        isActive
                                            ? "text-primary font-bold text-2xl scale-110"
                                            : "text-muted-foreground/30 text-lg hover:text-muted-foreground/60"
                                    )}
                                    onClick={() => api?.scrollTo(index)}
                                >
                                    {item}
                                </div>
                            </CarouselItem>
                        )
                    })}
                </CarouselContent>
            </Carousel>
        </div>
    )
}
