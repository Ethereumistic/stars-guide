"use client";

import { GiCursedStar } from "react-icons/gi";

export function SessionListEmpty() {
    return (
        <div className="px-3 py-4 text-center">
            <GiCursedStar className="mx-auto mb-2 h-5 w-5 text-foreground/15" />
            <p className="text-[11px] font-serif italic leading-relaxed text-foreground/25">
                Your whispers from the stars will appear here
            </p>
        </div>
    );
}