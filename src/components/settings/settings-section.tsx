'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"

interface SettingsSectionProps {
    icon: React.ReactNode
    title: string
    description: string
    children: React.ReactNode
    delay?: number
}

export function SettingsSection({ icon, title, description, children, delay = 0 }: SettingsSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {icon}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-serif">{title}</CardTitle>
                            <CardDescription className="text-xs">{description}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {children}
                </CardContent>
            </Card>
        </motion.div>
    )
}
