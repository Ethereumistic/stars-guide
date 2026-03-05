"use client";

import { IconType } from "react-icons";

interface SpecItem {
    label: string;
    value: string;
    icon: IconType;
    subValue?: string;
}

interface AspectSpecsGridProps {
    specs: SpecItem[];
}

export function AspectSpecsGrid({ specs }: AspectSpecsGridProps) {
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
                        <p className="text-lg sm:text-2xl font-serif text-white tracking-tight">
                            {item.value}
                        </p>
                        {item.subValue && (
                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                                {item.subValue}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-2 sm:pl-4">
                        <item.icon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                    </div>
                </div>
            ))}
        </div>
    );
}
