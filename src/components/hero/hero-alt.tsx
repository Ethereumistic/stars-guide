"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { StarsBackground } from "@/components/hero/stars-background"
import { GiAstrolabe, GiMoonOrbit, GiSun, GiCometSpark } from "react-icons/gi"
import { ArrowRight, Sparkles } from "lucide-react"
import { motion, useScroll, useTransform } from "motion/react"

const floatingIcons = [
    { Icon: GiSun, label: "Sun", delay: 0, color: "text-yellow-500/70" },
    { Icon: GiMoonOrbit, label: "Moon", delay: 0.2, color: "text-blue-300/70" },
    { Icon: GiCometSpark, label: "Comet", delay: 0.4, color: "text-purple-400/70" },
]

export function HeroAlternative() {
    const [mounted, setMounted] = React.useState(false)
    const heroRef = React.useRef<HTMLElement>(null)

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    })

    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <motion.section
            ref={heroRef}
            style={{ opacity, scale }}
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
            {/* Animated Background */}
            <ShootingStars
                minSpeed={20}
                maxSpeed={40}
                minDelay={600}
                maxDelay={2500}
                starColor="#d4af37"
                trailColor="#6366f1"
            />
            <StarsBackground
                starDensity={0.00025}
                allStarsTwinkle={true}
                twinkleProbability={0.85}
                minTwinkleSpeed={0.4}
                maxTwinkleSpeed={1.5}
            />

            {/* Floating Decorative Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {floatingIcons.map((item, index) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 50 }}
                        animate={mounted ? {
                            opacity: [0.3, 0.6, 0.3],
                            y: [0, -30, 0],
                            rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{
                            duration: 8,
                            delay: item.delay,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className={`absolute ${item.color}`}
                        style={{
                            left: `${20 + index * 30}%`,
                            top: `${0 + index * 20}%`
                        }}
                    >
                        <item.Icon className="size-16 sm:size-24 opacity-50" />
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* Left Column: Copy & CTA */}
                    <div className="space-y-8 text-center lg:text-left">

                        {/* Eyebrow */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={mounted ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/40 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground">
                                <Sparkles className="size-4 text-primary animate-pulse" />
                                <span className="font-sans italic">AI-Powered Astrological Guidance</span>
                            </div>
                        </motion.div>

                        {/* Headline */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={mounted ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.7, delay: 0.25 }}
                            className="space-y-4"
                        >
                            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                                <span className="block text-foreground">Your Personal</span>
                                <span className="block bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Cosmic Oracle
                                </span>
                            </h1>
                        </motion.div>

                        {/* Subheadline */}
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={mounted ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.7, delay: 0.4 }}
                            className="text-xl text-muted-foreground font-sans leading-relaxed max-w-xl mx-auto lg:mx-0"
                        >
                            An AI that evolves with you—remembering your story, understanding your patterns,
                            guiding you through life's transits with wisdom, not fortune-telling.
                        </motion.p>

                        {/* Value Props */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={mounted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.7, delay: 0.55 }}
                            className="flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground font-sans justify-center lg:justify-start"
                        >
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-primary animate-pulse" />
                                <span>Personalized Daily Insights</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-primary animate-pulse" />
                                <span>AI-Generated Astral Art</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-primary animate-pulse" />
                                <span>Precision Astronomy</span>
                            </div>
                        </motion.div>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={mounted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.7, delay: 0.7 }}
                            className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center lg:justify-start"
                        >
                            <Button
                                size="lg"
                                asChild
                                className="group relative overflow-hidden font-serif uppercase tracking-widest text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 w-full sm:w-auto"
                            >
                                <Link href="/birth-chart" className="flex items-center justify-center gap-2">
                                    <GiAstrolabe className="size-5 transition-transform group-hover:rotate-180 duration-700" />
                                    <span>Get Your Chart Free</span>
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
                                </Link>
                            </Button>

                            <Button
                                size="lg"
                                variant="ghost"
                                asChild
                                className="group font-sans text-base px-8 py-6 hover:bg-accent/40 transition-all duration-300 w-full sm:w-auto"
                            >
                                <Link href="/readings" className="flex items-center justify-center gap-2">
                                    <span>See How It Works</span>
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
                                </Link>
                            </Button>
                        </motion.div>

                    </div>

                    {/* Right Column: Interactive Chart Preview / Feature Showcase */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={mounted ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="relative aspect-square max-w-md mx-auto lg:max-w-none"
                    >
                        {/* Glowing Chart Circle */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10 blur-3xl animate-pulse" />

                        {/* Chart Placeholder / Could be actual SVG chart */}
                        <div className="relative size-full rounded-full border-2 border-primary/30 bg-background/5 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                            {/* Rotating Orbital Rings */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-8 border border-primary/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-16 border border-purple-400/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-24 border border-blue-400/20 rounded-full"
                            />

                            {/* Center Icon */}
                            <div className="relative z-10 p-8 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10">
                                <GiAstrolabe className="size-20 sm:size-32 text-primary  -translate-y-1 sm:-translate-y-2" />
                            </div>

                            {/* Floating Data Points */}
                            {[0, 72, 144, 216, 288].map((angle, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: [0.5, 1, 0.5],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        duration: 3,
                                        delay: i * 0.3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute size-3 rounded-full bg-primary shadow-lg shadow-primary/50"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        transform: `rotate(${angle}deg) translateY(-140px)`
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* Social Proof / Trust Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={mounted ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.9 }}
                    className="mt-16 pt-12 border-t border-primary/10"
                >
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                        key={i}
                                        className="size-10 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-background"
                                    />
                                ))}
                            </div>
                            <span className="font-sans">Trusted by 10,000+ seekers</span>
                        </div>

                        <div className="hidden md:block w-px h-6 bg-border" />

                        <div className="flex items-center gap-2">
                            <span className="text-primary text-lg">★★★★★</span>
                            <span className="font-sans">4.9/5 rating</span>
                        </div>

                        <div className="hidden md:block w-px h-6 bg-border" />

                        <div className="flex items-center gap-2 font-sans italic">
                            <Sparkles className="size-4 text-primary" />
                            <span>Free to start, no credit card required</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </motion.section>
    )
}