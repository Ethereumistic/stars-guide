"use client"

import * as React from "react"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { StarsBackground } from "@/components/hero/stars-background"
import { motion } from "motion/react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative min-h-[calc(100vh-5rem)] w-full flex items-center justify-center overflow-hidden py-12 px-4">
            {/* Animated Background */}
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

            {/* Content with subtle entrance animation */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                {children}
            </motion.div>

            {/* Decorative vignette */}
            <div className="absolute inset-0 bg-radial-[circle_at_center,var(--background)_0%,transparent_70%] pointer-events-none opacity-50" />
        </div>
    )
}
