"use client";

import { ReactNode } from "react";
import { IconType } from "react-icons";

interface SpecItem {
    label: string;
    value: string;
    icon: IconType;
    subValue?: string;
}

interface SignSpecsGridProps {
    specs: SpecItem[];
}

const HOUSE_NAMES = [
    "1st House", "2nd House", "3rd House", "4th House", "5th House", "6th House",
    "7th House", "8th House", "9th House", "10th House", "11th House", "12th House"
];

export { HOUSE_NAMES };

export function SignSpecsGrid({ specs }: SignSpecsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
            {specs.map((item, idx) => (
                <div
                    key={idx}
                    className="p-6 flex flex-row items-center justify-between group hover:bg-white/2 transition-colors"
                >
                    <div className="flex flex-col space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                            {item.label}
                        </span>
                        <p className="text-2xl font-serif text-white tracking-tight">
                            {item.value}
                        </p>
                    </div>

                    <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-4">
                        {item.label === "Ruler" && item.subValue ? (
                            <span className="text-4xl md:text-5xl font-sans leading-none">
                                {item.subValue}
                            </span>
                        ) : (
                            <item.icon className="w-8 h-8 md:w-10 md:h-10" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
