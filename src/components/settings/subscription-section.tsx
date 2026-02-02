'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SettingsSection } from "./settings-section"
import {
    User,
    Sparkles,
    CreditCard,
    Crown,
    Zap,
    Star,
    ChevronRight
} from "lucide-react"

// Tier display info
const tierInfo: Record<string, { name: string; color: string; icon: React.ElementType }> = {
    free: { name: "Free", color: "text-muted-foreground", icon: User },
    cosmic: { name: "Cosmic", color: "text-primary", icon: Star },
    astral: { name: "Astral", color: "text-galactic", icon: Sparkles },
    vip: { name: "VIP", color: "text-primary", icon: Crown },
    lifetime: { name: "Lifetime", color: "text-primary", icon: Zap },
}

interface SubscriptionSectionProps {
    tier: string
    subscriptionStatus: string
    delay?: number
}

export function SubscriptionSection({ tier, subscriptionStatus, delay = 0.2 }: SubscriptionSectionProps) {
    const currentTier = tierInfo[tier] || tierInfo.free
    const TierIcon = currentTier.icon

    return (
        <SettingsSection
            icon={<CreditCard className="h-5 w-5" />}
            title="Subscription"
            description="Your current plan"
            delay={delay}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${currentTier.color}`}>
                        <TierIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{currentTier.name}</p>
                            <Badge variant={tier === 'free' ? 'secondary' : 'default'}>
                                {subscriptionStatus}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {tier === 'free'
                                ? 'Upgrade to unlock all features'
                                : 'Thank you for your support!'}
                        </p>
                    </div>
                </div>
            </div>

            {tier === 'free' && (
                <Button className="w-full group" size="lg">
                    <Zap className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                    Upgrade to Cosmic
                    <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
            )}

            {tier === 'cosmic' && (
                <Button className="w-full group" variant="outline" size="lg">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Astral
                    <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
            )}
        </SettingsSection>
    )
}
