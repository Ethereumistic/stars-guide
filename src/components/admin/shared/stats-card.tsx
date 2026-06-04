"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: "default" | "emerald" | "amber" | "red" | "galactic";
    icon?: React.ReactNode;
}

const accentColors: Record<string, string> = {
    default: "",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    galactic: "text-primary",
};

export function StatsCard({ title, value, subtitle, accent = "default", icon }: StatsCardProps) {
    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className={cn("text-3xl font-bold", accentColors[accent])}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                </div>
                {subtitle && (
                    <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}