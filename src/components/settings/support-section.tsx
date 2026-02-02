'use client'

import { SettingsSection } from "./settings-section"
import {
    LifeBuoy,
    Heart,
    MessageCircle,
    BookOpen,
    HelpCircle,
    MessageSquare,
    ChevronRight,
    ExternalLink
} from "lucide-react"

interface SupportSectionProps {
    delay?: number
}

export function SupportSection({ delay = 0.3 }: SupportSectionProps) {
    return (
        <SettingsSection
            icon={<LifeBuoy className="h-5 w-5" />}
            title="Support"
            description="Resources and help"
            delay={delay}
        >
            <div className="space-y-2">
                <SupportLink
                    icon={<Heart className="h-4 w-4" />}
                    label="Mental Health Resources"
                    description="Support for your wellbeing"
                    href="/support/mental-health"
                />
                <SupportLink
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="Crisis Text Line"
                    description="Text HOME to 741741"
                    href="https://www.crisistextline.org/"
                    external
                />
                <SupportLink
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Learn Astrology"
                    description="Guides and tutorials"
                    href="/learn"
                />
                <SupportLink
                    icon={<HelpCircle className="h-4 w-4" />}
                    label="FAQ"
                    description="Frequently asked questions"
                    href="/faq"
                />
                <SupportLink
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Send Feedback"
                    description="Help us improve"
                    href="/feedback"
                />
            </div>
        </SettingsSection>
    )
}

// Support Link Component
interface SupportLinkProps {
    icon: React.ReactNode
    label: string
    description: string
    href: string
    external?: boolean
}

function SupportLink({ icon, label, description, href, external }: SupportLinkProps) {
    const Component = external ? 'a' : 'button'
    const props = external
        ? { href, target: '_blank', rel: 'noopener noreferrer' }
        : { onClick: () => window.location.href = href }

    return (
        <Component
            {...props}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-primary/5 transition-colors group text-left"
        >
            <div className="flex items-center gap-3">
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                    {icon}
                </span>
                <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            {external ? (
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            )}
        </Component>
    )
}
