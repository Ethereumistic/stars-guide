"use client";

import * as React from "react";
import { Logo } from "@/components/ui/logo";
import { StarsBackground, ShootingStars } from "@/components/hero/stars-canvas";

export default function InviteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden select-none">
            {/* Background effects */}
            <div className="fixed inset-0 z-0">
                <ShootingStars
                    minSpeed={15}
                    maxSpeed={35}
                    minDelay={1200}
                    maxDelay={4000}
                    starColor="#d4af37"
                    trailColor="#8b7355"
                />
                <StarsBackground
                    starDensity={0.0003}
                    allStarsTwinkle={true}
                    twinkleProbability={0.7}
                    minTwinkleSpeed={0.5}
                    maxTwinkleSpeed={1.5}
                />
            </div>

            {/* Centered Logo Header */}
            <div className="relative z-20 flex justify-center pt-6 pb-4 shrink-0">
                <Logo size="sm" variant="logo" layout="horizontal_right" />
            </div>

            {/* Content area — scrollable, centred horizontally, top-aligned so card scrolls naturally on short screens */}
            <div className="relative z-10 flex-1 overflow-y-auto">
                <div className="min-h-full flex items-start justify-center px-4 py-4">
                    {children}
                </div>
            </div>

            {/* Decorative vignette */}
            <div className="absolute inset-0 bg-radial-[circle_at_center,var(--background)_0%,transparent_70%] pointer-events-none opacity-50 z-0" />
        </div>
    );
}