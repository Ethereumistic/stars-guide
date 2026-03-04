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

export interface BreadcrumbConfig {
    label: string;
    href?: string;
}

export interface PageBreadcrumbsProps {
    items: BreadcrumbConfig[];
    currentPage: string;
    currentPageColor?: string;
    showBorder?: boolean;
}

export function PageBreadcrumbs({
    items,
    currentPage,
    currentPageColor = "text-primary",
    showBorder = true,
}: PageBreadcrumbsProps) {
    return (
        <div className="mb-12 md:mb-16">
            <Breadcrumb className={`${showBorder ? "border-b border-white/10 pb-6" : ""}`}>
                <BreadcrumbList className="text-white/40">
                    {items.map((item, index) => (
                        <BreadcrumbItem key={item.label}>
                            <BreadcrumbLink
                                asChild
                                className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
                            >
                                <Link href={item.href || "/"}>{item.label}</Link>
                            </BreadcrumbLink>
                            {index < items.length - 1 && (
                                <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            )}
                        </BreadcrumbItem>
                    ))}
                    <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                    <BreadcrumbItem>
                        <BreadcrumbPage
                            className="font-mono text-[10px] uppercase tracking-[0.2em]"
                            style={currentPageColor !== "text-primary" ? { color: currentPageColor } : undefined}
                        >
                            {currentPage}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}
