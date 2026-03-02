"use client"

import * as React from "react"
import { Logo } from "@/components/ui/logo"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { StarsBackground } from "@/components/hero/stars-background"
import { motion } from "motion/react"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
            {/* Background effects */}
            <div className="fixed inset-0 z-0">
                <ShootingStars
                    minSpeed={15}
                    maxSpeed={35}
                    minDelay={1200}
                    maxDelay={4000}
                    starColor="#d4af37"
                    trailColor="#8b7355"
                />
                <StarsBackground
                    starDensity={0.0003}
                    allStarsTwinkle={true}
                    twinkleProbability={0.7}
                    minTwinkleSpeed={0.5}
                    maxTwinkleSpeed={1.5}
                />
            </div>

            {/* Centered Logo Header */}
            <div className="relative z-20 flex justify-center pt-6 pb-4 shrink-0">
                <Logo size="sm" variant="logo" layout="horizontal_right" />
            </div>

            {/* Content area - fills remaining space, no scroll */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-7xl"
                >
                    {children}
                </motion.div>
            </div>

            {/* Decorative vignette */}
            <div className="absolute inset-0 bg-radial-[circle_at_center,var(--background)_0%,transparent_70%] pointer-events-none opacity-50 z-0" />
        </div>
    )
}
