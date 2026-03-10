'use client'

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
            transition={{ duration: 0.4, delay }}
            className="border border-white/10 bg-black/50 rounded-md overflow-hidden"
        >
            {/* Section header — matches the sign page card header style */}
            <div className="p-6 md:p-8 border-b border-white/10 flex items-center gap-4">
                <div className="p-2 rounded-md bg-white/5 border border-white/10 text-white/50">
                    {icon}
                </div>
                <div>
                    <h2 className="font-serif text-xl text-white tracking-tight">{title}</h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 block mt-0.5">
                        {description}
                    </span>
                </div>
            </div>

            {/* Section content */}
            <div className="p-6 md:p-8">
                {children}
            </div>
        </motion.div>
    )
}
