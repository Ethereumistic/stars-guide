'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 pt-8 pb-32">

                {/* Header skeleton */}
                <div className="mb-10 border-b border-white/10 pb-8 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-12 w-48" />
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Sidebar skeleton */}
                    <div className="hidden lg:flex flex-col w-56 shrink-0 gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                                <Skeleton className="size-4 rounded" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-2.5 w-16" />
                                    <Skeleton className="h-2 w-28" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content skeleton */}
                    <div className="flex-1">
                        <Card className="border-white/10 bg-black/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-5/6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
