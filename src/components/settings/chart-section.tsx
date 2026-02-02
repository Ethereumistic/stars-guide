'use client'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SettingsSection } from "./settings-section"
import {
    Sparkles,
    Calendar,
    Clock,
    MapPin,
    Pencil
} from "lucide-react"

interface BirthData {
    date: string
    time: string
    location: {
        lat: number
        long: number
        city: string
        country: string
        countryCode?: string
    }
    sunSign: string
    moonSign: string
    risingSign: string
}

interface ChartSectionProps {
    birthData: BirthData | undefined
    delay?: number
}

export function ChartSection({ birthData, delay = 0.1 }: ChartSectionProps) {
    const router = useRouter()

    // Format date nicely
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    // Format time nicely
    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${minutes} ${ampm}`
    }

    return (
        <SettingsSection
            icon={<Sparkles className="h-5 w-5" />}
            title="Chart"
            description="Your birth chart data"
            delay={delay}
        >
            {birthData ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Birth Date</span>
                        </div>
                        <span className="text-sm font-medium">{formatDate(birthData.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Birth Time</span>
                        </div>
                        <span className="text-sm font-medium">{formatTime(birthData.time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Birth Place</span>
                        </div>
                        <span className="text-sm font-medium">{birthData.location.city}, {birthData.location.country}</span>
                    </div>

                    <Separator className="my-2" />

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/onboarding?edit=true')}
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Birth Chart Data
                    </Button>
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No birth data available</p>
                    <Button onClick={() => router.push('/onboarding')}>
                        Complete Onboarding
                    </Button>
                </div>
            )}
        </SettingsSection>
    )
}
