"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Moon, AlertTriangle } from "lucide-react";

interface AstroInsight {
    insight: string;
    data: any;
}

interface AstroCorrelationProps {
    insights: AstroInsight[];
    className?: string;
}

export function AstroCorrelation({ insights, className }: AstroCorrelationProps) {
    if (insights.length === 0) {
        return <p className="text-xs text-white/30">No astro correlations found yet — keep journaling!</p>;
    }

    return (
        <div className={cn("space-y-3", className)}>
            {insights.map((insight, i) => {
                // Choose an icon based on the type of insight
                let Icon = Sparkles;
                if (insight.insight.toLowerCase().includes("moon")) Icon = Moon;
                if (insight.insight.toLowerCase().includes("retrograd")) Icon = AlertTriangle;

                return (
                    <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                        <Icon className="h-4 w-4 text-galactic/60 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-white/70">{insight.insight}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}