"use client";

import { TbBuildingArch } from "react-icons/tb";

interface HouseEssenceProps {
    theme: string; // developmentalTheme
}

export function HouseEssence({ theme }: HouseEssenceProps) {
    return (
        <div className="p-8 border border-white/10 bg-black/50 space-y-6 rounded-md">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <TbBuildingArch className="text-white/40 w-5 h-5" />
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Developmental Theme</h3>
            </div>
            <p className="text-[17px] text-white/80 leading-relaxed font-serif">
                {theme}
            </p>
        </div>
    );
}