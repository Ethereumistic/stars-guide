'use client'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SettingsSection } from "./settings-section"
import { NatalChart } from "@/components/dashboard/natal-chart/natal-chart"
import { Sparkles } from "lucide-react"
import type { StoredBirthData } from "@/lib/birth-chart/types"

interface ChartSectionProps {
    birthData: StoredBirthData | undefined
    delay?: number
}

export function ChartSection({ birthData, delay = 0.1 }: ChartSectionProps) {
    const router = useRouter()

    return (
        <SettingsSection
            icon={<Sparkles className="h-5 w-5" />}
            title="Charts"
            description="Natal chart / Planetary positions"
            delay={delay}
        >
            {birthData ? (
                <NatalChart birthData={birthData} />
            ) : (
                <div className="text-center py-10 space-y-4">
                    <p className="text-white/40 font-sans text-sm">
                        No birth data found. Complete onboarding to generate your chart.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/onboarding')}>
                        Complete Onboarding
                    </Button>
                </div>
            )}
        </SettingsSection>
    )
}
