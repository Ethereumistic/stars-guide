"use client"

import * as React from "react"
import { Logo } from "@/components/ui/logo"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { StarsBackground } from "@/components/hero/stars-background"
import { motion } from "motion/react"
import { useOnboardingStore } from "@/store/use-onboarding-store"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { step } = useOnboardingStore()

    // Steps that need scrolling on mobile (content-heavy)
    // Steps 1-4, 8, 9 are compact and centered nicely
    // Steps 5-6 (detective), 7 (calculation), 10 (reveal) need scroll room
    const needsScroll = step === 2 || step === 5 || step === 6 || step === 7 || step === 10

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

            {/* Content area */}
            <div className={`relative z-10 flex-1 flex px-4 ${
                needsScroll
                    ? 'items-start overflow-y-auto md:items-center md:overflow-hidden py-4 md:py-0'
                    : 'items-center justify-center overflow-hidden'
            }`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`w-full ${needsScroll ? 'max-w-7xl' : 'max-w-7xl'}`}
                >
                    {children}
                </motion.div>
            </div>

            {/* Decorative vignette */}
            <div className="absolute inset-0 bg-radial-[circle_at_center,var(--background)_0%,transparent_70%] pointer-events-none opacity-50 z-0" />
        </div>
    )
}
