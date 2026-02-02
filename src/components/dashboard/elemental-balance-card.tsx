'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ELEMENTS, type ZodiacSign } from "@/utils/zodiac"
import { motion } from "motion/react"

// Static maps for element styles - Tailwind can see these at build time
const elementBorders: Record<string, string> = {
    Fire: 'border-fire/30 bg-fire/5',
    Water: 'border-water/30 bg-water/5',
    Earth: 'border-earth/30 bg-earth/5',
    Air: 'border-air/30 bg-air/5',
}

const elementBgClasses: Record<string, string> = {
    Fire: 'bg-fire/20',
    Water: 'bg-water/20',
    Earth: 'bg-earth/20',
    Air: 'bg-air/20',
}

const elementTextClasses: Record<string, string> = {
    Fire: 'text-fire',
    Water: 'text-water',
    Earth: 'text-earth',
    Air: 'text-air',
}

const elementDotClasses: Record<string, string> = {
    Fire: 'bg-fire',
    Water: 'bg-water',
    Earth: 'bg-earth',
    Air: 'bg-air',
}

interface ElementalBalanceCardProps {
    sunSign: ZodiacSign | undefined
    moonSign: ZodiacSign | undefined
    risingSign: ZodiacSign | undefined
    delay?: number
}

export function ElementalBalanceCard({ sunSign, moonSign, risingSign, delay = 0.4 }: ElementalBalanceCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="font-serif text-2xl">Your Elemental Balance</CardTitle>
                    <CardDescription className="font-sans">
                        The cosmic forces that shape your personality
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(ELEMENTS).map(([key, element]) => {
                            const ElementIcon = element.icon
                            const count = [sunSign, moonSign, risingSign].filter(
                                s => s?.element === key
                            ).length

                            return (
                                <div
                                    key={key}
                                    className={`
                                        relative p-4 rounded-xl border transition-all duration-300
                                        ${count > 0
                                            ? elementBorders[key]
                                            : 'border-border/50 bg-muted/20 opacity-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${count > 0 ? elementBgClasses[key] : 'bg-muted/30'}`}>
                                            <ElementIcon className={`h-5 w-5 ${elementTextClasses[key]}`} />
                                        </div>
                                        <div>
                                            <p className={`font-medium ${count > 0 ? elementTextClasses[key] : 'text-muted-foreground'}`}>
                                                {element.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {count} {count === 1 ? 'placement' : 'placements'}
                                            </p>
                                        </div>
                                    </div>
                                    {count > 0 && (
                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${elementDotClasses[key]}`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
