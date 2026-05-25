"use client";

import {
    GiThreeFriends,
    GiPalette,
    GiPolarStar,
    GiCoins,
    GiHearts,
    GiHealthNormal,
    GiCandles,
    GiFamilyHouse,
    GiSunPriest,
} from "react-icons/gi";

import { IconType } from "react-icons";

interface DomainScore {
    name: string;
    score: number; // 0-100
}

interface DomainScoresGridProps {
    scores: DomainScore[];
    accentColor: string;
}

const DOMAIN_ICONS: Record<string, IconType> = {
    social: GiThreeFriends,
    creativity: GiPalette,
    career: GiPolarStar,
    finance: GiCoins,
    health: GiHealthNormal,
    love: GiHearts,
    family: GiFamilyHouse,
    spirituality: GiSunPriest
};

function getDomainIcon(name: string): IconType | null {
    return DOMAIN_ICONS[name.toLowerCase()] ?? null;
}

export function DomainScoresGrid({ scores, accentColor }: DomainScoresGridProps) {
    return (
        <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
            {scores.map((item, idx) => {
                const Icon = getDomainIcon(item.name);
                return (
                    <div
                        key={idx}
                        className="p-3 sm:p-6 flex flex-row items-center gap-3 sm:gap-4 group hover:bg-white/2 transition-colors"
                    >
                        <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity shrink-0">
                            {Icon && (
                                <Icon
                                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white"
                                />
                            )}
                        </div>
                        <div className="flex flex-col space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                            <p className="text-lg sm:text-2xl font-serif text-white tracking-tight leading-none">
                                {item.name}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 sm:h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${item.score}%`,
                                            backgroundColor: accentColor,
                                            opacity: item.score >= 70 ? 0.8 : item.score >= 50 ? 0.55 : 0.35,
                                        }}
                                    />
                                </div>
                                <span className="text-sm sm:text-base font-serif text-white/40 tracking-tight tabular-nums leading-none">
                                    {item.score}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}