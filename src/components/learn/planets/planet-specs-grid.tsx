"use client";

import { IconType } from "react-icons";

interface SpecItem {
    label: string;
    value: string;
    icon?: IconType;
    icons?: IconType[];
    subValue?: string;
}

interface PlanetSpecsGridProps {
    specs: SpecItem[];
}

export function PlanetSpecsGrid({ specs }: PlanetSpecsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
            {specs.map((item, idx) => (
                <div
                    key={idx}
                    className="p-3 sm:p-6 flex flex-row items-center justify-between group hover:bg-white/2 transition-colors"
                >
                    <div className="flex flex-col space-y-1 sm:space-y-2">
                        <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                            {item.label}
                        </span>
                        <div className="text-lg sm:text-2xl font-serif text-white tracking-tight flex flex-col space-y-1">
                            {item.value ? (
                                item.value.includes(",") ? (
                                    item.value.split(",").map((val, i) => (
                                        <span key={i} className="block leading-snug">{val.trim()}</span>
                                    ))
                                ) : (
                                    <span className="block leading-snug">{item.value}</span>
                                )
                            ) : (
                                <span className="block leading-snug">N/A</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-2 sm:pl-4">
                        {item.subValue ? (
                            <span className="text-2xl sm:text-4xl md:text-5xl font-sans leading-none">
                                {item.subValue}
                            </span>
                        ) : item.icons && item.icons.length > 0 ? (
                            <div className="flex flex-col space-y-2">
                                {item.icons.map((IconComp, i) => (
                                    <IconComp key={i} className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                                ))}
                            </div>
                        ) : item.icon ? (
                            <item.icon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}
