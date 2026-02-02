'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Skeleton */}
                <div className="text-center space-y-2">
                    <Skeleton className="h-12 w-64 mx-auto" />
                    <Skeleton className="h-5 w-96 mx-auto" />
                </div>

                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="border-primary/10">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-16 w-16 rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-28" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Birth Details Skeleton */}
                <Card className="border-primary/10">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Elemental Balance Skeleton */}
                <Card className="border-primary/10">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 rounded-xl border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-lg" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
