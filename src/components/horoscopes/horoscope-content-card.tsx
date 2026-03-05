"use client";

import { useEffect, useState } from "react";
import { LockedPricingCard } from "@/components/pricing/locked-pricing-card";

interface LockedHoroscope {
    requiredTier: "popular" | "premium";
}

interface HoroscopeContentCardProps {
    horoscopeData?: {
        content: string;
    } | {
        requiredTier: string;
    } | null;
    isLoading?: boolean;
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
    isLoading,
    date,
    styles,
}: HoroscopeContentCardProps) {
    const [showSkeleton, setShowSkeleton] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, 12000);
        return () => clearTimeout(timer);
    }, []);

    const shouldShowSkeleton = (isLoading || horoscopeData === undefined) && showSkeleton;

    if (shouldShowSkeleton) {
        return (
            <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134">
                <div className="p-8 md:p-12 border-b border-white/10">
                    <div
                        className="h-2 w-24 rounded animate-pulse mb-6"
                        style={{ backgroundColor: styles.primary, opacity: 0.3 }}
                    />
                    <div
                        className="h-10 md:h-12 w-3/4 rounded animate-pulse mb-4"
                        style={{ backgroundColor: styles.primary, opacity: 0.2 }}
                    />
                    <div className="space-y-4">
                        <div className="h-5 w-full rounded animate-pulse bg-white/10" />
                        <div className="h-5 w-full rounded animate-pulse bg-white/10" />
                        <div className="h-5 w-5/6 rounded animate-pulse bg-white/10" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134">
            {horoscopeData == null && (
                <div className="p-8 md:p-10 text-center flex flex-col items-center justify-center space-y-6">
                    <h2 className="text-2xl font-serif">The stars are still aligning.</h2>
                    <p className="text-white/60 font-serif">
                        We haven't published the forecast for{" "}
                        <span className="font-sans text-white">{date}</span> yet. Check back soon.
                    </p>
                </div>
            )}

            {horoscopeData != null && !("content" in horoscopeData) && (
                <LockedPricingCard requiredTier={horoscopeData.requiredTier as "popular" | "premium"} />
            )}

            {horoscopeData != null && "content" in horoscopeData && (() => {
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
