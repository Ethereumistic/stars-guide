'use client'

import { useUserStore } from "@/store/use-user-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getZodiacSignByName } from "@/utils/zodiac"
import { motion } from "motion/react"
import { Sun, Moon, Sunrise } from "lucide-react"
import {
    SignCard,
    BirthDetailsCard,
    ElementalBalanceCard,
    DashboardSkeleton
} from "@/components/dashboard"

export default function DashboardPage() {
    const { user, isLoading, isAuthenticated, needsOnboarding } = useUserStore()
    const router = useRouter()

    // Redirect logic
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated()) {
                router.push("/sign-in")
            } else if (needsOnboarding()) {
                router.push("/onboarding")
            }
        }
    }, [isLoading, isAuthenticated, needsOnboarding, router])

    // Loading state
    if (isLoading || !user) {
        return <DashboardSkeleton />
    }

    const birthData = user.birthData

    // If no birth data, redirect to onboarding
    if (!birthData) {
        return <DashboardSkeleton />
    }

    // Get zodiac sign details
    const sunSign = getZodiacSignByName(birthData.sunSign)
    const moonSign = getZodiacSignByName(birthData.moonSign)
    const risingSign = getZodiacSignByName(birthData.risingSign)

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-2"
                >
                    <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
                        Your Cosmic Profile
                    </h1>
                    <p className="text-muted-foreground font-sans italic">
                        The stars have aligned to reveal your celestial blueprint
                    </p>
                </motion.div>

                {/* Main Signs Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SignCard
                        title="Sun Sign"
                        subtitle="Your Core Identity"
                        icon={<Sun className="h-5 w-5" />}
                        sign={sunSign}
                        delay={0}
                    />

                    <SignCard
                        title="Moon Sign"
                        subtitle="Your Inner World"
                        icon={<Moon className="h-5 w-5" />}
                        sign={moonSign}
                        delay={0.1}
                    />

                    <SignCard
                        title="Rising Sign"
                        subtitle="Your Outer Self"
                        icon={<Sunrise className="h-5 w-5" />}
                        sign={risingSign}
                        delay={0.2}
                    />
                </div>

                {/* Birth Details Card */}
                <BirthDetailsCard birthData={birthData} delay={0.3} />

                {/* Elemental Balance Card */}
                <ElementalBalanceCard
                    sunSign={sunSign}
                    moonSign={moonSign}
                    risingSign={risingSign}
                    delay={0.4}
                />
            </div>
        </div>
    )
}
