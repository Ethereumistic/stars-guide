"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { Calendar, MapPin, Clock, Sparkles } from "lucide-react"
import { motion } from "motion/react"

export function EarlyAccessStep() {
    const { nextStep } = useOnboardingStore()

    const features = [
        { icon: Calendar, label: "Birth Date", description: "Your solar identity" },
        { icon: MapPin, label: "Birth Place", description: "Geographic alignment" },
        { icon: Clock, label: "Birth Time", description: "Precise house mapping" },
    ]

    return (
        <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="space-y-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="inline-block p-3 mb-2"
                >
                    <Sparkles className="size-8 text-primary" />
                </motion.div>
                <h1 className="text-4xl font-serif tracking-tight">Let's Map Your Cosmic Blueprint</h1>
                <p className="text-muted-foreground text-lg">
                    We'll need 3 pieces of information to calculate your natal chart
                    with precision astronomy.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {features.map((f, i) => (
                    <motion.div
                        key={f.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                    >
                        <Card className="p-4 bg-background/40 backdrop-blur-md border flex flex-col items-center gap-3">
                            <f.icon className="size-6 text-primary" />
                            <div className="space-y-1">
                                <p className="font-medium text-sm">{f.label}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{f.description}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
            >
                <Button size="lg" className="px-8 py-6 text-lg group" onClick={nextStep}>
                    Begin Journey
                    <Sparkles className="ml-2 size-5 transition-transform group-hover:rotate-12" />
                </Button>
                <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-[0.2em]">
                    Your data is encrypted and never shared.
                </p>
            </motion.div>
        </div>
    )
}
