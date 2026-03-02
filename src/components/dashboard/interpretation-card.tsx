'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"
import { getPlacementData } from "@/astrology/interpretationEngine"
import { Sparkles } from "lucide-react"

interface InterpretationCardProps {
    sunSignName?: string
    delay?: number
}

export function InterpretationCard({ sunSignName, delay = 0.5 }: InterpretationCardProps) {
    if (!sunSignName) return null;

    let synthesisData;
    try {
        synthesisData = getPlacementData("sun", sunSignName);
    } catch (e) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="border-primary/20 bg-card/60 backdrop-blur-md overflow-hidden relative">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <CardTitle className="font-serif text-2xl">Core Cosmic Synthesis</CardTitle>
                    </div>
                    <CardDescription className="font-sans">
                        How your underlying sun placement shapes your identity...
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                        <p className="text-lg md:text-xl font-serif leading-relaxed text-foreground/90 italic">
                            {synthesisData.synthesis}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
