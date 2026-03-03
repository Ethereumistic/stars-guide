"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { TbSparkles } from "react-icons/tb";

interface HoroscopeContent {
    content: string;
}

interface LockedHoroscope {
    requiredTier: string;
}

interface HoroscopeContentCardProps {
    horoscopeData: {
        content: string;
    } | {
        requiredTier: string;
    } | null;
    date: string;
    styles: {
        primary: string;
        glow: string;
    };
}

export function HoroscopeContentCard({
    horoscopeData,
    date,
    styles,
}: HoroscopeContentCardProps) {
    return (
        <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden">
            {horoscopeData === null && (
                <div className="p-8 md:p-10 text-center flex flex-col items-center justify-center space-y-6">
                    <h2 className="text-2xl font-serif">The stars are still aligning.</h2>
                    <p className="text-white/60 font-serif">
                        We haven't published the forecast for{" "}
                        <span className="font-sans text-white">{date}</span> yet. Check back soon.
                    </p>
                </div>
            )}

            {horoscopeData !== null && !("content" in horoscopeData) && (
                <div className="relative w-full min-h-[280px] flex items-center justify-center p-8">
                    <div className="absolute inset-0 p-8 text-white/20 select-none opacity-40 font-mono text-[10px] md:text-xs overflow-hidden leading-relaxed">
                        <p>
                            &gt; STATUS: UNAUTHORIZED INTERCEPT DETECTED <br /><br />
                            Well, well, well. Look at you. We are highly impressed by your Developer Tools and DOM-manipulation skills.
                            However, the stars protect their secrets. The actual astrological data for this date never left our servers.
                            Please purchase the {horoscopeData.requiredTier === 'premium' ? 'Premium' : 'Popular'} plan to view this highly accurate, geopolitically abstracted horoscope. Nice try, though! ;)
                            <br /><br />
                            Astrological synthesis requires deep quantum entanglement of planetary bodies along the ecliptic plane mapped against standard Earth temporal metrics. Access denied.
                        </p>
                    </div>
                    <div className="absolute inset-0 backdrop-blur-xl bg-black/60 flex flex-col items-center justify-center z-10 p-8 text-center backdrop-saturate-150">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border border-white/10 bg-black"
                            style={{ boxShadow: `0_0_30px ${styles.glow}` }}
                        >
                            <Lock className="w-5 h-5" style={{ color: styles.primary }} />
                        </div>
                        <h3 className="text-xl font-serif text-white tracking-wide mb-3">Premium Insight</h3>
                        <p className="mb-7 max-w-xs text-white/60 font-serif text-base leading-relaxed">
                            Upgrade to the{" "}
                            <span className="text-white mx-1 tracking-widest font-mono text-xs uppercase">
                                {horoscopeData.requiredTier}
                            </span>{" "}
                            tier to unlock your forecast for {date}.
                        </p>
                        <Link
                            href="/pricing"
                            className="px-7 py-2.5 bg-white text-black font-mono text-xs uppercase tracking-widest rounded-sm hover:bg-white/90 transition-all font-bold"
                        >
                            Unlock Access
                        </Link>
                    </div>
                </div>
            )}

            {horoscopeData !== null && "content" in horoscopeData && (
                <div className="p-6 md:p-8 space-y-5">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <TbSparkles className="text-white/40 w-5 h-5" />
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
                            Daily Horoscope
                        </h3>
                    </div>
                    <p className="text-base md:text-lg text-white/90 leading-relaxed font-serif whitespace-pre-wrap">
                        {horoscopeData.content}
                    </p>
                </div>
            )}
        </div>
    );
}
