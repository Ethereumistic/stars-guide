'use client'

import { SettingsSection } from "./settings-section"
import { TbUsers, TbStarFilled } from "react-icons/tb"

interface FriendsSectionProps {
    delay?: number
}

export function FriendsSection({ delay = 0 }: FriendsSectionProps) {
    return (
        <SettingsSection
            icon={<TbUsers className="h-5 w-5" />}
            title="Friends"
            description="Friends & Family"
            delay={delay}
        >
            <div className="py-12 flex flex-col items-center justify-center text-center gap-5">
                <div className="relative flex items-center justify-center">
                    <div
                        className="absolute w-24 h-24 rounded-full opacity-20"
                        style={{ background: "radial-gradient(circle, oklch(0.8 0.1 60) 0%, transparent 70%)" }}
                    />
                    <TbStarFilled className="size-8 text-white/20 relative z-10" />
                </div>
                <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                        Coming Soon
                    </p>
                    <p className="text-white/40 text-sm font-sans max-w-xs leading-relaxed">
                        Share the cosmos with friends & family. Synastry and chart comparisons across your circle.
                    </p>
                </div>
            </div>
        </SettingsSection>
    )
}
