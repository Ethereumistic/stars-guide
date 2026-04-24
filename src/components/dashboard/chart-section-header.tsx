"use client";

import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Table2, CircleDot, LayoutGrid } from "lucide-react";

export interface BreadcrumbConfig {
    label: string;
    href?: string;
}

export interface ChartSectionHeaderProps {
    breadcrumbs?: BreadcrumbConfig[];
    title: string;
    titleAccent: string;
    activeVisualization: string;
    onVisualizationChange: (value: string) => void;
    filterLabel?: string;
    className?: string;
}

const visualizationFilters = [
    { value: "both", label: "Both", icon: LayoutGrid },
    { value: "table", label: "Table", icon: Table2 },
    { value: "circle", label: "Circle", icon: CircleDot },
];

export function ChartSectionHeader({
    breadcrumbs,
    title,
    titleAccent,
    activeVisualization,
    onVisualizationChange,
    filterLabel = "Filter by Visualization",
    className,
}: ChartSectionHeaderProps) {
    const currentPageLabel = breadcrumbs?.[breadcrumbs.length - 1]?.label;
    const navItems = breadcrumbs ? breadcrumbs.slice(0, -1) : [];

    return (
        <>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="mb-12 md:mb-16">
                    <Breadcrumb>
                        <BreadcrumbList className="text-white/40">
                            {navItems.map((item, index) => (
                                <BreadcrumbItem key={item.label}>
                                    <BreadcrumbLink
                                        asChild
                                        className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        <Link href={item.href || "/"}>{item.label}</Link>
                                    </BreadcrumbLink>
                                    {index < navItems.length - 1 && (
                                        <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                                    )}
                                </BreadcrumbItem>
                            ))}
                            <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                                    {currentPageLabel}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            )}

            <div className={`flex flex-col md:flex-row md:items-end justify-between mb-16 ${className || ""}`}>
                <div>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter">
                        {title}
                        <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            {" "}{titleAccent}
                        </span>
                    </h1>
                </div>

                <div className="flex flex-col gap-4 md:items-end text-center md:text-left mt-8 md:mt-0">
                    <span className="text-base uppercase font-mono text-primary/60 tracking-[0.3em] font-bold">
                        {filterLabel}
                    </span>
                    <Tabs value={activeVisualization} onValueChange={onVisualizationChange} className="w-fit rounded-md mx-auto md:mx-0">
                        <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-2 justify-center">
                            {visualizationFilters.map((filter) => (
                                <TabsTrigger
                                    key={filter.value}
                                    value={filter.value}
                                    className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                >
                                    <filter.icon className="size-5 md:size-4 md:mr-2 text-primary" />
                                    <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">
                                        {filter.label}
                                    </span>
                                    <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">
                                        {filter.label}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>
        </>
    );
}