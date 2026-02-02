"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { motion } from "motion/react"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel"

export function BirthTimeStep() {
    const { birthTime, setBirthTime, setStep, prevStep } = useOnboardingStore()

    // Parse existing time if available
    const initialHour = birthTime ? parseInt(birthTime.split(':')[0]) : 12
    const initialMinute = birthTime ? parseInt(birthTime.split(':')[1]) : 0

    const [hour, setHour] = React.useState(initialHour)
    const [minute, setMinute] = React.useState(initialMinute)

    const handleContinue = () => {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        setBirthTime(time24)
        setStep(7)
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    return (
        <div className="max-w-md md:max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl text-center font-serif tracking-tight">What time were you born?</h2>

            <div className="flex  flex-col items-center space-y-8">
                {/* 2-Column Time Picker */}
                <div className="relative w-full max-w-[240px] flex items-center justify-center bg-background/30 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden h-64 shadow-2xl">
                    {/* Highlight Overlay */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-primary/10 border-y border-primary/20 pointer-events-none" />

                    {/* Fading Edges */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-background via-background/50 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />

                    <div className="flex w-full h-full relative z-0">
                        {/* Hour Column */}
                        <ScrollColumn
                            items={hours.map(h => h.toString().padStart(2, '0'))}
                            value={hour.toString().padStart(2, '0')}
                            onSelect={(val) => setHour(parseInt(val as string))}
                            className="w-1/2"
                        />

                        {/* Separator */}
                        <div className="flex items-center justify-center w-4 h-full z-10">
                            <span className="text-3xl font-serif text-primary/50 translate-y-[-2px]">:</span>
                        </div>

                        {/* Minute Column */}
                        <ScrollColumn
                            items={minutes.map(m => m.toString().padStart(2, '0'))}
                            value={minute.toString().padStart(2, '0')}
                            onSelect={(val) => setMinute(parseInt(val as string))}
                            className="w-1/2"
                        />
                    </div>
                </div>


            </div>


            <div className="flex justify-between items-center pt-4 max-w-md mx-auto">
                <Button size="icon" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="size-5" />
                </Button>
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

interface ScrollColumnProps {
    items: (string | number)[]
    value: string | number
    onSelect: (value: string | number) => void
    className?: string
}

function ScrollColumn({ items, value, onSelect, className }: ScrollColumnProps) {
    const [api, setApi] = React.useState<CarouselApi>()

    React.useEffect(() => {
        if (!api) return
        const index = items.indexOf(value)
        if (index !== -1 && api.selectedScrollSnap() !== index) {
            api.scrollTo(index, true)
        }
    }, [api, items, value])

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
                    dragFree: true,
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
