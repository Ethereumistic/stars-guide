"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

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

function parseHoroscopeContent(content: string): string[] {
    // 1. Split the text into an array of sentences, keeping punctuation intact
    const sentenceRegex = /[^.!?]+[.!?]+["']?(?:\s+|$)/g;
    const sentences = content.match(sentenceRegex)?.map(s => s.trim()) || [content];

    // Fallback for unusually short content
    if (sentences.length <= 2) return sentences;

    // 2. The Hook / Title
    const title = sentences[0];

    // 3. Find the logical split point (The Reframing Pivot)
    let splitIndex = -1;

    for (let i = 1; i < sentences.length; i++) {
        const currentSentence = sentences[i].toLowerCase();
        const nextSentence = (sentences[i + 1] || "").toLowerCase();

        // Look for the "isn't [x] -> it's [y]" pattern.
        // It either happens in one sentence or across two consecutive ones.
        if (currentSentence.includes("isn't")) {
            if (currentSentence.includes("it's")) {
                splitIndex = i; // Split right after this sentence
                break;
            } else if (nextSentence.includes("it's")) {
                splitIndex = i + 1; // Split right after the next sentence
                break;
            }
        }
    }

    // Fallback: If the specific pattern isn't found, split the body sentences in half
    if (splitIndex === -1) {
        splitIndex = Math.floor((sentences.length - 1) / 2);
    }

    // 4. Construct the body paragraphs
    const para1 = sentences.slice(1, splitIndex + 1).join(" ");
    const para2 = sentences.slice(splitIndex + 1).join(" ");

    // Return an array with the Title as the first item, followed by the body paragraphs
    return [title, para1, para2].filter(p => p.trim().length > 0);
}

function extractTitle(content: string): string {
    return content.split(/[.!?]\s/)[0];
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

            {horoscopeData !== null && "content" in horoscopeData && (() => {
                const paragraphs = parseHoroscopeContent(horoscopeData.content);
                const title = extractTitle(paragraphs[0] || '');

                let firstParagraphRest = paragraphs[0] || '';
                const titleMatch = firstParagraphRest.match(/^[^.!?]*[.!?]\s*/);
                if (titleMatch) {
                    firstParagraphRest = firstParagraphRest.substring(titleMatch[0].length);
                }

                const bodyParagraphs = [
                    firstParagraphRest,
                    ...paragraphs.slice(1)
                ].filter(p => p.trim().length > 0);

                return (
                    <div className="p-8 md:p-12 border-b border-white/10">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">Daily Horoscope</span>
                        <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight mb-8">
                            {title}
                        </h2>
                        <div className="space-y-6">
                            {bodyParagraphs.map((para, i) => (
                                <p key={i} className="text-lg text-white/70 leading-relaxed font-serif">
                                    {para}
                                </p>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
