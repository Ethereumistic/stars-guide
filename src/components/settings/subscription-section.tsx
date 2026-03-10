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

import { plans, getPlanByTier, PricingPlan } from "@/components/pricing/pricing-data"

interface SubscriptionSectionProps {
    tier: "free" | "popular" | "premium"
    subscriptionStatus: string
    delay?: number
}

export function SubscriptionSection({ tier, subscriptionStatus, delay = 0.2 }: SubscriptionSectionProps) {
    const plan = getPlanByTier(tier) || plans[0]
    const TierIcon = plan.iconComponent

    const planIndex = plans.findIndex(p => p.tier === tier)
    const nextPlan = planIndex !== -1 && planIndex < plans.length - 1 ? plans[planIndex + 1] : null

    // Map tier to color for settings UI
    const tierColor = tier === 'free' ? 'text-muted-foreground' : 
                     tier === 'popular' ? 'text-primary' : 'text-galactic'

    return (
        <SettingsSection
            icon={<CreditCard className="h-5 w-5" />}
            title="Subscription"
            description="Your current plan"
            delay={delay}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${tierColor}`}>
                        <TierIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{plan.name}</p>
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

            {nextPlan && (
                <Button 
                    className="w-full group" 
                    variant={tier === 'free' ? 'default' : 'outline'} 
                    size="lg"
                >
                    {tier === 'free' ? (
                        <Zap className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                    ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Upgrade to {nextPlan.name}
                    <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
            )}
        </SettingsSection>
    )
}
