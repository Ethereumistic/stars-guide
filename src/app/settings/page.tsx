'use client'

import { useState, useEffect } from "react"
import { useUserStore } from "@/store/use-user-store"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
    YouSection,
    ChartSection,
    SubscriptionSection,
    SupportSection,
    LogoutFooter,
    SettingsSkeleton,
    FriendsSection
} from "@/components/settings"
import {
    TbUser,
    TbChartDonut,
    TbCreditCard,
    TbUsers,
    TbLifebuoy,
} from "react-icons/tb"

type TabId = "you" | "charts" | "plan" | "friends" | "help"

interface Tab {
    id: TabId
    label: string
    icon: React.ElementType
    description: string
}

const TABS: Tab[] = [
    { id: "you", label: "You", icon: TbUser, description: "User details & Security" },
    { id: "charts", label: "Charts", icon: TbChartDonut, description: "Birth chart data" },
    { id: "plan", label: "Plan", icon: TbCreditCard, description: "Billing / Subscription" },
    { id: "friends", label: "Friends", icon: TbUsers, description: "Friends & Family" },
    { id: "help", label: "Help", icon: TbLifebuoy, description: "Support / FAQ" },
]

export default function SettingsPage() {
    const { user, isLoading, isAuthenticated, needsOnboarding } = useUserStore()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabId>("you")

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated()) {
                router.push("/sign-in")
            } else if (needsOnboarding()) {
                router.push("/onboarding")
            }
        }
    }, [isLoading, isAuthenticated, needsOnboarding, router])

    if (isLoading || !user) {
        return <SettingsSkeleton />
    }

    const activeTabData = TABS.find(t => t.id === activeTab)!

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">

            {/* Ambient background — same pattern as sign detail page */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.08] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 30% 40%, oklch(0.5 0.2 240) 0%, transparent 55%)`
                    }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-full h-full opacity-[0.06] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 70% 70%, oklch(0.8 0.1 60) 0%, transparent 50%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 pt-8 pb-32">

                {/* Page Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10 border-b border-white/10 pb-8"
                >
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30 block mb-3">
                        Account
                    </span>
                    <h1 className="font-serif text-4xl md:text-5xl text-white tracking-tight">
                        Settings
                    </h1>
                </motion.div>

                {/* Main Layout: Sidebar + Content */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-24 lg:pb-0">

                    {/* ─── Desktop Vertical Sidebar ─── */}
                    <motion.aside
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="hidden lg:flex flex-col w-56 shrink-0 gap-1"
                    >
                        {TABS.map((tab, i) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <motion.button
                                    key={tab.id}
                                    id={`settings-tab-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                                    className={`
                                        group relative flex items-center gap-3.5 text-left
                                        px-4 py-3.5 rounded-md transition-all duration-200
                                        ${isActive
                                            ? "bg-white/5 border border-white/15 text-white"
                                            : "border border-transparent text-white/40 hover:text-white/70 hover:bg-white/3"
                                        }
                                    `}
                                >
                                    {/* Active indicator line */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabIndicator"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-white/30 group-hover:text-white/60"}`} />
                                    <div className="min-w-0">
                                        <span className={`font-mono text-xs uppercase tracking-[0.15em] block leading-tight transition-colors ${isActive ? "text-white" : ""}`}>
                                            {tab.label}
                                        </span>
                                        <span className="text-[10px] text-white/30 truncate block mt-0.5 font-sans">
                                            {tab.description}
                                        </span>
                                    </div>
                                </motion.button>
                            )
                        })}

                        {/* Logout — below the tabs */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <LogoutFooter delay={0} compact />
                        </div>
                    </motion.aside>

                    {/* ─── Content Area ─── */}
                    <div className="flex-1 min-w-0">
                        {/* Section label on desktop */}
                        <motion.div
                            key={activeTab + "-label"}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="hidden lg:block mb-6"
                        >
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                                {activeTabData.description}
                            </span>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === "you" && <YouSection user={user} delay={0} />}
                                {activeTab === "charts" && <ChartSection birthData={user.birthData} delay={0} />}
                                {activeTab === "plan" && (
                                    <SubscriptionSection
                                        tier={user.tier}
                                        subscriptionStatus={user.subscriptionStatus}
                                        delay={0}
                                    />
                                )}
                                {activeTab === "friends" && <FriendsSection delay={0} />}
                                {activeTab === "help" && <SupportSection delay={0} />}
                            </motion.div>
                        </AnimatePresence>

                        {/* Logout on mobile (under content) */}
                        <div className="lg:hidden mt-8">
                            <LogoutFooter delay={0} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile Sticky Footer Ribbon ─── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl">
                    <nav className="flex items-center justify-around px-2 py-2">
                        {TABS.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    id={`settings-mobile-tab-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                                        transition-all duration-200 min-w-0
                                        ${isActive ? "text-primary" : "text-white/35 hover:text-white/60"}
                                    `}
                                >
                                    <Icon className={`size-5 transition-all ${isActive ? "scale-110" : ""}`} />
                                    <span className={`font-mono text-[9px] uppercase tracking-widest leading-none transition-all ${isActive ? "text-primary" : "text-white/30"}`}>
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileActiveIndicator"
                                            className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                                            style={{ position: 'static' }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </div>
    )
}
