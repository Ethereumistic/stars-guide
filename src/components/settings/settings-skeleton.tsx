'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="space-y-1">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-5 w-64" />
                </div>

                {/* Sections */}
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-primary/10">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-1">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
