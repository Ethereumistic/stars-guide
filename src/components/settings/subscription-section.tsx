'use client'

import Link from "next/link"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useInView } from "motion/react"
import { Check, X, Zap, Sparkles, ArrowRight, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsSection } from "./settings-section"
import { plans, IconMap } from "@/components/pricing/pricing-data"
import type { PricingPlan } from "@/components/pricing/pricing-data"
import { StarsBackground } from "@/components/hero/stars-background"
import { ShootingStars } from "@/components/hero/shooting-stars"
import { CreditCard } from "lucide-react"
import useEmblaCarousel from "embla-carousel-react"

interface SubscriptionSectionProps {
    tier: "free" | "popular" | "premium"
    subscriptionStatus: string
    delay?: number
}

// ── Individual plan card (shared between carousel + column) ──
function PlanCard({
    plan,
    currentTier,
    isYearly,
    isCurrent,
    isNextAfterCurrent,
}: {
    plan: PricingPlan
    currentTier: string
    isYearly: boolean
    isCurrent: boolean
    isNextAfterCurrent: boolean
}) {
    const Icon = IconMap[plan.icon]
    const ui = plan.ui
    const isPopular = plan.tier === "popular"
    const isPremium = plan.tier === "premium"

    // Glare — exact PricingCard logic
    const [isHovered, setIsHovered] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { amount: 0.8, once: false })
    const showGlare = isMobile ? isInView : isHovered

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])

    return (
        <div
            ref={cardRef}
            className="relative group rounded-xl overflow-hidden h-full flex flex-col"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Outer glow */}
            <div
                className="absolute inset-0 -z-10 rounded-xl opacity-15 group-hover:opacity-35 blur-xl transition-opacity duration-700"
                style={{ backgroundColor: ui.glowColor }}
            />

            {/* Card body */}
            <div className={`relative flex flex-col h-full bg-black/60 backdrop-blur-2xl border rounded-xl overflow-hidden p-6 ${ui.borderColor}`}>

                {/* Stars BG */}
                {/* <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
                    <StarsBackground starDensity={0.00012} allStarsTwinkle twinkleProbability={0.7} minTwinkleSpeed={0.3} maxTwinkleSpeed={1.0} />
                    {isPopular && <ShootingStars minSpeed={15} maxSpeed={30} minDelay={600} maxDelay={1400} starColor={ui.starColor} trailColor={ui.trailColor} />}
                    {isPremium && <ShootingStars minSpeed={15} maxSpeed={30} minDelay={400} maxDelay={900} starColor={ui.starColor} trailColor={ui.trailColor} />}
                </div> */}

                {/* Animated diagonal glare — exact PricingCard implementation */}
                <AnimatePresence>
                    {showGlare && (
                        <motion.div
                            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.div
                                className="absolute inset-0 w-[200%] h-[200%]"
                                initial={{ x: "-50%", y: "-50%" }}
                                animate={{ x: "50%", y: "50%" }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                style={{
                                    background: `linear-gradient(135deg, transparent 0%, transparent 40%, ${ui.diagonalGlareColor} 50%, transparent 60%, transparent 100%)`,
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Inner subtle backdrop */}
                <div
                    className="absolute inset-0 backdrop-blur-[0.5px] pointer-events-none -z-10"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)" }}
                />

                {/* "Current" badge — anchored to card body corner, outside content wrapper */}
                {isCurrent && (
                    <Badge
                        variant={plan.tier === "free" ? "outline" : plan.tier === "popular" ? "default" : "premium"}
                        className="absolute top-3 right-3 z-20 font-mono uppercase tracking-widest text-[9px]"
                    >
                        Current
                    </Badge>
                )}

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        {Icon && (
                            <div className={`${ui.iconColor} ${ui.iconGlowColor} shrink-0`}>
                                <Icon className="size-9" />
                            </div>
                        )}
                        <div>
                            <h3 className={`text-2xl font-serif font-bold leading-tight ${ui.titleColorClass}`}>
                                {plan.name}
                            </h3>
                            <p className="text-[10px] text-white/35 font-mono uppercase tracking-widest mt-0.5">
                                {plan.description}
                            </p>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5 pb-5 border-b border-white/10">
                        <div className="flex items-baseline gap-1.5">
                            {isYearly && plan.price.yearlyMonthly !== plan.price.monthly && plan.price.monthly !== "€0" && (
                                <span className="text-2xl font-serif tracking-tight text-white/30 line-through mr-1">
                                    {plan.price.monthly}
                                </span>
                            )}
                            <span className="text-4xl font-serif tracking-tight text-white">
                                {isYearly ? plan.price.yearlyMonthly : plan.price.monthly}
                            </span>
                            {plan.price.monthly !== "€0" && (
                                <span className="text-white/40 text-sm">/mo</span>
                            )}
                        </div>
                        <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-widest">
                            {isYearly ? plan.setup.yearly : plan.setup.monthly}
                        </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                        {plan.features.map((feature, i) => (
                            <li key={i} className={`flex items-center gap-3 ${!feature.included && "opacity-35"}`}>
                                {feature.included ? (
                                    <div className={`shrink-0 rounded-full p-0.5 border ${isPopular ? "border-primary/20 bg-primary/10 text-primary" :
                                        isPremium ? "border-galactic/20 bg-galactic/10 text-galactic" :
                                            "border-white/10 bg-white/5 text-white/60"
                                        }`}>
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                ) : (
                                    <div className="shrink-0 rounded-full p-0.5 text-white/20">
                                        <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                                    </div>
                                )}
                                <span className={`text-sm ${feature.included ? "text-white/80" : "text-white/25 line-through"}`}>
                                    {feature.text}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* CTA area */}
                    <div className="mt-6">
                        {isCurrent ? (
                            /* Current plan footer */
                            (isPopular || isPremium) ? (
                                <div className="pt-5 border-t border-white/10">
                                    <button className="group flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-white/20 hover:text-red-400 transition-colors duration-200">
                                        <AlertTriangle className="size-3 group-hover:text-red-400 transition-colors" />
                                        Cancel Subscription
                                    </button>
                                    <p className="text-[9px] text-white/15 font-sans mt-1.5">
                                        Your plan will remain active until the end of the billing period.
                                    </p>
                                </div>
                            ) : null
                        ) : (
                            /* Upgrade CTA */
                            <Link href={plan.href} className="block">
                                {isPopular ? (
                                    <Button size="lg" variant="default" className="w-full uppercase font-serif font-bold tracking-widest group">
                                        <Zap className="size-4 mr-2 group-hover:animate-pulse" />
                                        {plan.cta}
                                        <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                ) : isPremium ? (
                                    <Button size="lg" variant="galactic" className="w-full uppercase font-serif font-bold tracking-widest group">
                                        <Sparkles className="size-4 mr-2" />
                                        {plan.cta}
                                        <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                ) : (
                                    <Button size="lg" variant="outline" className="w-full uppercase font-serif font-bold tracking-widest group hover:text-white">
                                        {plan.cta}
                                        <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                )}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Main section ──
export function SubscriptionSection({ tier, subscriptionStatus, delay = 0.2 }: SubscriptionSectionProps) {
    const [isYearly, setIsYearly] = useState(false)
    const billingValue = isYearly ? "yearly" : "monthly"

    const planIndex = plans.findIndex(p => p.tier === tier)
    const currentPlan = plans[planIndex]

    // Embla carousel
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: "start",
        slidesToScroll: 1,
        containScroll: "trimSnaps",
    })
    const [canScrollPrev, setCanScrollPrev] = useState(false)
    const [canScrollNext, setCanScrollNext] = useState(false)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setCanScrollPrev(emblaApi.canScrollPrev())
        setCanScrollNext(emblaApi.canScrollNext())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on("select", onSelect)
        emblaApi.on("reInit", onSelect)
        return () => { emblaApi.off("select", onSelect) }
    }, [emblaApi, onSelect])

    // Scroll to index 1 on mount for paid tiers so their plan is centred
    useEffect(() => {
        if (!emblaApi) return
        if (tier === "popular" || tier === "premium") {
            emblaApi.scrollTo(1, true) // true = instant (no animation flash)
        }
    }, [emblaApi, tier])

    return (
        <SettingsSection
            icon={<CreditCard className="h-5 w-5" />}
            title="Plan"
            description="Billing / Subscription"
            delay={delay}
        >
            {/* ── Header row: label + billing toggle (exact pricing page design) ── */}
            <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                    All Plans
                </span>

                {/* Exact copy of pricing page toggle */}
                <Tabs
                    value={billingValue}
                    onValueChange={(v) => setIsYearly(v === "yearly")}
                    className="w-auto"
                >
                    <TabsList className="relative flex items-center p-1 bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm h-auto">
                        <TabsTrigger
                            value="monthly"
                            className="relative w-24 text-center px-4 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Monthly
                        </TabsTrigger>
                        <TabsTrigger
                            value="yearly"
                            className="relative w-24 text-center px-4 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Yearly
                            <span className="absolute -top-3 -right-2 bg-primary text-[#0A0F1A] text-[10px] font-bold px-2 py-0.5 rounded-full rotate-3 shadow-md">
                                -44%
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* ── Mobile: vertical stack ── */}
            <div className="flex flex-col gap-4 md:hidden">
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.tier}
                        plan={plan}
                        currentTier={tier}
                        isYearly={isYearly}
                        isCurrent={plan.tier === tier}
                        isNextAfterCurrent={plans.indexOf(plan) === planIndex + 1}
                    />
                ))}
            </div>

            {/* ── Desktop: Apple-style carousel ── */}
            <div className="hidden md:block">
                <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex gap-4" style={{ touchAction: "pan-y" }}>
                        {plans.map((plan) => (
                            <div
                                key={plan.tier}
                                /* ~42% width = ~2.4 cards visible, clean peek of 3rd */
                                className="flex-none min-w-0"
                                style={{ width: "38%" }}
                            >
                                <PlanCard
                                    plan={plan}
                                    currentTier={tier}
                                    isYearly={isYearly}
                                    isCurrent={plan.tier === tier}
                                    isNextAfterCurrent={plans.indexOf(plan) === planIndex + 1}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Apple-style chevron nav — bottom right */}
                <div className="flex justify-end items-center gap-2 mt-4">
                    <button
                        onClick={() => emblaApi?.scrollPrev()}
                        disabled={!canScrollPrev}
                        className={`
                            flex items-center justify-center size-8 rounded-full border transition-all duration-200
                            ${canScrollPrev
                                ? "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30"
                                : "border-white/5 bg-white/2 text-white/15 cursor-not-allowed"
                            }
                        `}
                        aria-label="Previous plan"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        onClick={() => emblaApi?.scrollNext()}
                        disabled={!canScrollNext}
                        className={`
                            flex items-center justify-center size-8 rounded-full border transition-all duration-200
                            ${canScrollNext
                                ? "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30"
                                : "border-white/5 bg-white/2 text-white/15 cursor-not-allowed"
                            }
                        `}
                        aria-label="Next plan"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>

            {/* Trust line */}
            <p className="text-center text-[9px] text-white/20 mt-4 font-mono tracking-wider">
                Cancel anytime · No hidden fees · Secure checkout
            </p>
        </SettingsSection>
    )
}
