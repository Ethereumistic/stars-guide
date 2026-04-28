"use client";

import { GiStarSwirl } from "react-icons/gi";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function CollapsedOracleToggle() {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/20"
            aria-label="Expand sidebar"
            title="Expand sidebar"
        >
            <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-90 group-hover:opacity-0">
                <GiStarSwirl className="h-5 w-5" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                <PanelLeft className="h-5 w-5" />
            </span>
            <span className="sr-only">Expand sidebar</span>
        </button>
    );
}