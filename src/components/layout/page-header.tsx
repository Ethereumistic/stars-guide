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
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    breadcrumbs: BreadcrumbItem[];
    title: string;
    subtitle?: string;
    activeFilter?: string;
    onFilterChange?: (value: string) => void;
    showElementFilter?: boolean;
    className?: string;
}

const elementFilters = [
    { value: "all", label: "All", icon: null },
    { value: "fire", label: "Fire", icon: GiFlame },
    { value: "earth", label: "Earth", icon: GiStonePile },
    { value: "air", label: "Air", icon: GiTornado },
    { value: "water", label: "Water", icon: GiWaveCrest },
];

export function PageHeader({
    breadcrumbs,
    title,
    subtitle,
    activeFilter = "all",
    onFilterChange,
    showElementFilter = true,
    className,
}: PageHeaderProps) {
    const currentPage = breadcrumbs[breadcrumbs.length - 1];
    const navItems = breadcrumbs.slice(0, -1);

    return (
        <>
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
                                {currentPage.label}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className={`flex flex-col md:flex-row md:items-end justify-between mb-16 ${className || ""}`}>
                <div className="">
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter">
                        {title}
                        {subtitle && (
                            <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                {" "}{subtitle}
                            </span>
                        )}
                    </h1>
                </div>

                {showElementFilter && onFilterChange && (
                    <div className="flex flex-col gap-4 md:items-end text-center md:text-left mt-8 md:mt-0">
                        <span className="text-base uppercase font-mono text-primary/60 tracking-[0.3em] font-bold">
                            Filter by Element
                        </span>
                        <Tabs value={activeFilter} onValueChange={onFilterChange} className="w-fit rounded-md mx-auto md:mx-0 ">
                            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-2 justify-center">
                                {elementFilters.map((filter) => (
                                    <TabsTrigger
                                        key={filter.value}
                                        value={filter.value}
                                        className="relative w-16 md:w-20 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                    >
                                        {filter.icon ? (
                                            <filter.icon
                                                className={`size-6 md:size-4 md:mr-2 ${filter.value === "fire"
                                                    ? "text-fire"
                                                    : filter.value === "earth"
                                                        ? "text-earth"
                                                        : filter.value === "air"
                                                            ? "text-air"
                                                            : filter.value === "water"
                                                                ? "text-water"
                                                                : ""
                                                    }`}
                                            />
                                        ) : null}
                                        <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">
                                            {filter.icon ? "" : filter.label}
                                        </span>
                                        <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">
                                            {filter.label}
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </div>
        </>
    );
}
