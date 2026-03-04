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
            <div
                className="fade-in absolute top-[-30%] left-1/2 -translate-x-1/2 w-[150vw] h-[150vh] opacity-7 mix-blend-screen pointer-events-none blur-3xl"
                style={{
                    background: `radial-gradient(circle at center, var(--galactic) 0%, transparent 60%)`
                }}
            />
        </div>
    )
}
