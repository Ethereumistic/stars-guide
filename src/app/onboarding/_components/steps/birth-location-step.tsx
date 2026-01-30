"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { MapPin, ChevronRight, Info } from "lucide-react"

export function BirthLocationStep() {
    const { birthLocation, setBirthLocation, nextStep, prevStep } = useOnboardingStore()
    const [city, setCity] = React.useState(birthLocation?.city || "")
    const [country, setCountry] = React.useState(birthLocation?.country || "")

    // TODO: Implement Google Places API for precise city/village options
    const isValid = city.length > 1 && country.length > 1

    const handleContinue = () => {
        if (isValid) {
            setBirthLocation({
                city,
                country,
                lat: 0,
                long: 0,
            })
            nextStep()
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">Where were you born?</h2>
                <p className="text-muted-foreground text-sm">The Earth's position relative to the stars is vital.</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-muted-foreground px-1">Birth City</label>
                        <Input
                            placeholder="e.g. London, New York, Paris..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="bg-background/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-muted-foreground px-1">Country</label>
                        <Input
                            placeholder="e.g. United Kingdom"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="bg-background/50"
                        />
                    </div>
                </div>

                <div className="p-4 border bg-amber-500/5 flex gap-3 text-sm text-amber-200/80">
                    <Info className="size-5 shrink-0 text-amber-500" />
                    <p>
                        Precise coordinates are used to determine which planetary sphere
                        was rising over the horizon at your exact moment of birth.
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={prevStep}>
                    Back
                </Button>
                <Button
                    size="lg"
                    className="group"
                    disabled={!isValid}
                    onClick={handleContinue}
                >
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
