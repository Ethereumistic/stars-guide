"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { ChevronRight, Info } from "lucide-react"

export function BirthTimeStep() {
    const { birthTime, birthTimeConfidence, setBirthTime, setBirthTimeConfidence, setStep, prevStep } = useOnboardingStore()

    // Parse existing time if available
    const initialHour = birthTime ? birthTime.split(':')[0] : "12"
    const initialMinute = birthTime ? birthTime.split(':')[1].substring(0, 2) : "00"

    const [hour, setHour] = React.useState(initialHour)
    const [minute, setMinute] = React.useState(initialMinute)
    const [period, setPeriod] = React.useState("AM")
    const [confidence, setConfidence] = React.useState<any>(birthTimeConfidence || "high")

    const handleContinue = () => {
        let h = parseInt(hour)
        if (period === "PM" && h < 12) h += 12
        if (period === "AM" && h === 12) h = 0
        const time24 = `${h.toString().padStart(2, '0')}:${minute}`

        setBirthTime(time24)
        setBirthTimeConfidence(confidence)
        setStep(7)
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">What time were you born?</h2>
                <p className="text-muted-foreground text-sm">Precision makes for a better blueprint.</p>
            </div>

            <div className="flex gap-4 justify-center items-center">
                <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger className="h-16 w-24 text-2xl font-serif bg-background/50">
                        <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <span className="text-3xl font-serif text-primary">:</span>

                <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger className="h-16 w-24 text-2xl font-serif bg-background/50">
                        <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-16 w-24 text-2xl font-serif bg-background/50">
                        <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4 pt-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Confidence Level</Label>
                <RadioGroup value={confidence} onValueChange={setConfidence} className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-3 p-4 border bg-background/30 cursor-pointer hover:bg-primary/5 transition-colors">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high" className="cursor-pointer font-medium">Very confident (from birth certificate)</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border bg-background/30 cursor-pointer hover:bg-primary/5 transition-colors">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium" className="cursor-pointer font-medium">Somewhat confident (from memory)</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border bg-background/30 cursor-pointer hover:bg-primary/5 transition-colors">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low" className="cursor-pointer font-medium">Just guessing</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="p-4 border bg-primary/5 flex gap-3 text-sm italic text-muted-foreground">
                <Info className="size-5 shrink-0 text-primary/50" />
                <p>
                    Even a 4-minute difference can change your rising sign.
                    If you're unsure, check your birth certificate later!
                </p>
            </div>

            <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={prevStep}>
                    Back
                </Button>
                <Button size="lg" className="group" onClick={handleContinue}>
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
