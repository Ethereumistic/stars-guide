'use client'

import { useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { useParams, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { useMemo, useState } from "react"
import { useUserStore } from "@/store/use-user-store"
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs"
import { calculateFullChart } from "@/lib/birth-chart/full-chart"
import { ChartTableView } from "@/components/dashboard/natal-chart/chart-table-view"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { Button } from "@/components/ui/button"
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Lock, Users, Globe, LogIn, UserX, Table2, CircleDot, LayoutGrid } from "lucide-react"
import type { StoredBirthData } from "@/lib/birth-chart/types"

export default function UserProfilePage() {
    const params = useParams<{ username: string }>()
    const router = useRouter()
    const { user: currentUser, isLoading: authLoading } = useUserStore()
    const [visualization, setVisualization] = useState("both")

    const username = params.username

    const starsResult = useQuery(
        api.users.getStarsPageUser,
        currentUser !== undefined ? { username } : "skip"
    )

    // Auth loading
    if (authLoading || starsResult === undefined) {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                                Loading chart
                            </span>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // Not authenticated — must sign in
    if (starsResult.access === "unauthenticated") {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                    <AccessDenied
                        icon={<LogIn className="h-12 w-12 text-primary/40" />}
                        title="Sign in required"
                        description="You need to be signed in to view this birth chart."
                        actionLabel="Sign In"
                        onAction={() => router.push("/sign-in")}
                    />
                </div>
            </div>
        )
    }

    // Not found
    if (starsResult.access === "not_found") {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                    <AccessDenied
                        icon={<UserX className="h-12 w-12 text-primary/40" />}
                        title="User not found"
                        description="This profile doesn't exist or has been removed."
                        actionLabel="Go Home"
                        onAction={() => router.push("/")}
                    />
                </div>
            </div>
        )
    }

    // Private — no access
    if (starsResult.access === "private") {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                    <AccessDenied
                        icon={<Lock className="h-12 w-12 text-primary/40" />}
                        title="Sorry, you don't have access"
                        description="This user's birth chart is set to private and cannot be viewed by others."
                        actionLabel="Go Home"
                        onAction={() => router.push("/")}
                    />
                </div>
            </div>
        )
    }

    // Friends only — not friends
    if (starsResult.access === "friends_only") {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                    <AccessDenied
                        icon={<Users className="h-12 w-12 text-primary/40" />}
                        title="Sorry, you don't have access"
                        description="This birth chart is only visible to friends. Send a friend request to gain access."
                        actionLabel="Go Home"
                        onAction={() => router.push("/")}
                    />
                </div>
            </div>
        )
    }

    // Access granted!
    const { user: targetUser, birthData } = starsResult
    const displayUsername = targetUser.username || "User"

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
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

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                {/* Breadcrumbs: HOME / USERNAME */}
                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                    ]}
                    currentPage={displayUsername.toUpperCase()}
                    currentPageColor="rgb(212, 175, 55)"
                    showBorder={false}
                />

                {/* Title + Visualization Filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter">
                        {displayUsername}
                        <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            {' '}Birth Chart
                        </span>
                    </h1>

                    {birthData && (
                        <div className="flex flex-col gap-4 md:items-end text-center md:text-left mt-8 md:mt-0">
                            <span className="text-base uppercase font-mono text-primary/60 tracking-[0.3em] font-bold">
                                View
                            </span>
                            <Tabs value={visualization} onValueChange={setVisualization} className="w-fit rounded-md mx-auto md:mx-0">
                                <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-2 justify-center">
                                    <TabsTrigger
                                        value="both"
                                        className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                    >
                                        <LayoutGrid className="size-5 md:size-4 md:mr-2 text-primary" />
                                        <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">Both</span>
                                        <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">Both</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="table"
                                        className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                    >
                                        <Table2 className="size-5 md:size-4 md:mr-2 text-primary" />
                                        <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">Table</span>
                                        <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">Table</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="circle"
                                        className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                    >
                                        <CircleDot className="size-5 md:size-4 md:mr-2 text-primary" />
                                        <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">Circle</span>
                                        <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">Circle</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    )}
                </div>

                {/* Birth Chart Content */}
                {birthData ? (
                    <ChartContent
                        birthData={birthData as StoredBirthData}
                        visualization={visualization}
                    />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col items-center justify-center py-24 text-white/40"
                    >
                        <Globe className="h-12 w-12 text-primary/30 mb-4" />
                        <p className="font-sans text-sm">
                            This user hasn&apos;t set up their birth data yet.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

function ChartContent({
    birthData,
    visualization,
}: {
    birthData: StoredBirthData
    visualization: string
}) {
    const chartData = useMemo(() => {
        try {
            const [yearStr, monthStr, dayStr] = birthData.date.split("-")
            const [hoursStr, minutesStr] = birthData.time.split(":")

            const year = parseInt(yearStr, 10)
            const month = parseInt(monthStr, 10)
            const day = parseInt(dayStr, 10)
            const hours = parseInt(hoursStr, 10)
            const minutes = parseInt(minutesStr, 10)

            if (
                isNaN(year) || isNaN(month) || isNaN(day) ||
                isNaN(hours) || isNaN(minutes) ||
                typeof birthData.location?.lat !== "number" ||
                typeof birthData.location?.long !== "number"
            ) {
                return null
            }

            return calculateFullChart(
                year, month, day,
                hours, minutes,
                birthData.location.lat,
                birthData.location.long
            )
        } catch (error) {
            console.error("Error calculating natal chart:", error)
            return null
        }
    }, [birthData])

    if (!chartData) {
        return (
            <div className="p-8 text-center text-white/50 bg-[#0F0F0F] rounded-md border border-white/10">
                Incomplete birth data.
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full"
        >
            {visualization === "both" ? (
                <div className="grid grid-cols-7 gap-6">
                    <div className="col-span-3">
                        <ChartTableView data={chartData} />
                    </div>
                    <div className="col-span-4">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            ) : visualization === "table" ? (
                <ChartTableView data={chartData} />
            ) : (
                <div className="w-full flex justify-center">
                    <ChartCircleView data={chartData} />
                </div>
            )}
        </motion.div>
    )
}

function AccessDenied({
    icon,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon: React.ReactNode
    title: string
    description: string
    actionLabel: string
    onAction: () => void
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        >
            <div className="mb-6 p-6 rounded-full border border-white/10 bg-white/5">
                {icon}
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-white mb-3">
                {title}
            </h2>
            <p className="text-white/40 font-sans text-sm max-w-md mb-8">
                {description}
            </p>
            <Button
                variant="outline"
                onClick={onAction}
                className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            >
                {actionLabel}
            </Button>
        </motion.div>
    )
}