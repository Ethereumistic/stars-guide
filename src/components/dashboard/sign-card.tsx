'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { type ZodiacSign } from "@/utils/zodiac"
import { motion } from "motion/react"

// Static maps for element styles - Tailwind can see these at build time
const elementShadows: Record<string, string> = {
    Fire: 'hover:shadow-[0_0_30px_-5px_oklch(var(--fire)/0.5)] shadow-fire/40',
    Water: 'hover:shadow-[0_0_30px_-5px_oklch(var(--water)/0.5)] shadow-water/40',
    Earth: 'hover:shadow-[0_0_30px_-5px_oklch(var(--earth)/0.5)] shadow-earth/40',
    Air: 'hover:shadow-[0_0_30px_-5px_oklch(var(--air)/0.5)] shadow-air/40',
}

const elementTextClasses: Record<string, string> = {
    Fire: 'text-fire',
    Water: 'text-water',
    Earth: 'text-earth',
    Air: 'text-air',
}

interface SignCardProps {
    title: string
    subtitle: string
    icon: React.ReactNode
    sign: ZodiacSign | undefined
    delay?: number
}

export function SignCard({ title, subtitle, icon, sign, delay = 0 }: SignCardProps) {
    if (!sign) return null

    const SignIcon = sign.icon
    const ElementIcon = sign.elementIcon
    const elementClass = elementTextClasses[sign.element] || ''
    const shadowClass = elementShadows[sign.element] || ''

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="group"
        >
            <Card className={`relative overflow-hidden border-primary/10 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 ${shadowClass}`}>

                {/* Element icon accent - centered on right side */}
                <ElementIcon className={`absolute top-1/2 right-4 -translate-y-1/2 size-28 ${elementClass} opacity-10 pointer-events-none transition-all duration-500 group-hover:opacity-30 group-hover:scale-105 group-hover:-translate-y-[55%]`} />

                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {icon}
                        <span className="text-sm font-medium uppercase tracking-wider">{title}</span>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                            <SignIcon className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-serif text-2xl tracking-tight">{sign.name}</h3>
                            <p className="text-sm text-muted-foreground">{sign.dates}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {subtitle}
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            {sign.traits}
                        </p>
                    </div>

                </CardContent>
            </Card>
        </motion.div>
    )
}
