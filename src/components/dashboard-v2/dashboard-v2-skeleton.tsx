"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function DashboardV2Skeleton() {
    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Skeleton */}
                <div className="text-center space-y-3">
                    <Skeleton className="h-12 w-64 mx-auto" />
                    <Skeleton className="h-5 w-80 mx-auto" />
                </div>

                {/* Featured Row Skeleton (3 cards) */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-32 mx-auto" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-3 w-24" />
                                <div className="w-full h-[380px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Skeleton className="h-16 w-16 rounded-2xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Personal Planets Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-28 mx-auto" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-3 w-20" />
                                <div className="w-full h-[300px] rounded-xl bg-white/5 border border-white/10" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dual Chart Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 mx-auto" />
                    <div className="hidden lg:grid grid-cols-2 gap-6">
                        <div className="h-[300px] rounded-xl bg-white/5 border border-white/10" />
                        <div className="h-[300px] rounded-xl bg-white/5 border border-white/10" />
                    </div>
                    <div className="lg:hidden h-[300px] rounded-xl bg-white/5 border border-white/10" />
                </div>

                {/* Circular Elemental Balance Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-32 mx-auto" />
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-[280px] h-[280px] rounded-full bg-white/5 border border-white/10" />
                        <div className="grid grid-cols-4 gap-3 w-full max-w-md">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-16 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Social Planets Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 mx-auto" />
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-3 w-20" />
                                <div className="w-full h-[300px] rounded-xl bg-white/5 border border-white/10" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transpersonal Planets Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-36 mx-auto" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-3 w-20" />
                                <div className="w-full h-[300px] rounded-xl bg-white/5 border border-white/10" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chart Points Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 mx-auto" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-3 w-20" />
                                <div className="w-full h-[300px] rounded-xl bg-white/5 border border-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}