"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { StarsBackground } from "@/components/hero/stars-background"
import { GiAstrolabe, GiCrystalBall } from "react-icons/gi"
import { ArrowRight, Sparkles } from "lucide-react"
import { motion } from "motion/react"

export function Hero() {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <ShootingStars
                minSpeed={15}
                maxSpeed={35}
                minDelay={800}
                maxDelay={3000}
                starColor="#d4af37"
                trailColor="#8b7355"
            />
            <StarsBackground
                starDensity={0.0002}
                allStarsTwinkle={true}
                twinkleProbability={0.8}
                minTwinkleSpeed={0.3}
                maxTwinkleSpeed={1.2}
            />

            {/* Content Container */}
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center text-center space-y-8">

                    {/* Eyebrow Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={mounted ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/40 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground">
                            <Sparkles className="size-4 text-primary" />
                            <span className="font-sans italic">Beyond Static Horoscopes</span>
                        </div>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={mounted ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="space-y-4"
                    >
                        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                            <span className="block text-foreground">Navigate Your</span>
                            <span className="block bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                                Cosmic Journey
                            </span>
                        </h1>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={mounted ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.35 }}
                        className="max-w-2xl text-lg sm:text-xl text-muted-foreground font-sans leading-relaxed"
                    >
                        Your personal AI astrologer that remembers your story,
                        understands your patterns, and guides you through life's transits
                        with{" "}
                        <span className="text-foreground font-medium italic">wisdom</span>,
                        {" "}not{" "}
                        <span className="text-foreground font-medium italic">fortune-telling</span>.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={mounted ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center gap-4 pt-4"
                    >
                        {/* Primary CTA */}
                        <Button
                            size="lg"
                            asChild
                            className="group relative overflow-hidden font-serif uppercase tracking-widest text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                        >
                            <Link href="/onboarding" className="flex items-center gap-2">
                                <GiAstrolabe className="size-5 transition-transform group-hover:rotate-180 duration-700" />
                                <span>Natal Chart</span>
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
                            </Link>
                        </Button>

                        {/* Secondary CTA */}
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="group font-serif uppercase tracking-widest text-base px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
                        >
                            <Link href="/readings" className="flex items-center gap-2">
                                <GiCrystalBall className="size-5 transition-transform group-hover:scale-110 duration-300" />
                                <span>Explore Readings</span>
                            </Link>
                        </Button>
                    </motion.div>

                    {/* Trust Indicators / Social Proof */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={mounted ? { opacity: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="pt-8 flex flex-col sm:flex-row items-center gap-6 text-sm text-muted-foreground"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="size-8 rounded-full bg-linear-to-br from-primary/60 to-primary/30 border-2 border-background"
                                    />
                                ))}
                            </div>
                            <span className="font-sans italic">Join 10,000+ cosmic seekers</span>
                        </div>

                        <div className="hidden sm:block w-px h-4 bg-border" />

                        <div className="flex items-center gap-2 font-sans italic">
                            <span className="text-primary">★★★★★</span>
                            <span>Powered by precision astronomy</span>
                        </div>
                    </motion.div>

                </div>
            </div>

            {/* Decorative Gradient Overlay (Bottom Fade) */}
            {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" /> */}
        </section>
    )
}