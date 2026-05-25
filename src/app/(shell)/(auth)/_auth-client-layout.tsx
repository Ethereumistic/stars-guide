"use client";

import * as React from "react";

export default function AuthClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-[calc(100vh-5rem)] w-full overflow-hidden">
            {/* Content */}
            <div className="relative z-10 w-full min-h-[calc(100vh-5rem)]">
                {children}
            </div>

            {/* Decorative vignette */}
            <div
                className="fade-in absolute top-[-30%] left-1/2 -translate-x-1/2 w-[150vw] h-[150vh] opacity-7 mix-blend-screen pointer-events-none blur-3xl"
                style={{
                    background: `radial-gradient(circle at center, var(--galactic) 0%, transparent 60%)`
                }}
            />
        </div>
    );
}