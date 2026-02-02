'use client'

import { useUserStore } from "@/store/use-user-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "motion/react"
import {
    YouSection,
    ChartSection,
    SubscriptionSection,
    SupportSection,
    LogoutFooter,
    SettingsSkeleton
} from "@/components/settings"

export default function SettingsPage() {
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
        return <SettingsSkeleton />
    }

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-1"
                >
                    <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
                        Settings
                    </h1>
                    <p className="text-muted-foreground font-sans">
                        Manage your account and preferences
                    </p>
                </motion.div>

                {/* YOU Section */}
                <YouSection user={user} delay={0} />

                {/* CHART Section */}
                <ChartSection birthData={user.birthData} delay={0.1} />

                {/* SUBSCRIPTION Section */}
                <SubscriptionSection
                    tier={user.tier}
                    subscriptionStatus={user.subscriptionStatus}
                    delay={0.2}
                />

                {/* SUPPORT Section */}
                <SupportSection delay={0.3} />

                {/* FOOTER - Logout */}
                <LogoutFooter delay={0.4} />
            </div>
        </div>
    )
}
