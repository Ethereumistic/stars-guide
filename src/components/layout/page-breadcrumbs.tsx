"use client";

import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem as BreadcrumbItemUI,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo";

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
    // Build Schema.org breadcrumb data from items + currentPage
    const schemaItems = [
        ...items.map((item) => ({
            name: item.label,
            path: item.href || "/",
        })),
        {
            name: currentPage,
            path: items.length > 0 ? (items[items.length - 1]?.href || "/") : "/",
        },
    ];

    return (
        <div className="mb-12 md:mb-16">
            <JsonLd data={breadcrumbSchema(schemaItems)} />
            <Breadcrumb className={`${showBorder ? "border-b border-white/10 pb-6" : ""}`}>
                <BreadcrumbList className="text-white/40">
                    {items.map((item, index) => (
                        <BreadcrumbItemUI key={item.label}>
                            <BreadcrumbLink
                                asChild
                                className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
                            >
                                <Link href={item.href || "/"}>{item.label}</Link>
                            </BreadcrumbLink>
                            {index < items.length - 1 && (
                                <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            )}
                        </BreadcrumbItemUI>
                    ))}
                    <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                    <BreadcrumbItemUI>
                        <BreadcrumbPage
                            className="font-mono text-[10px] uppercase tracking-[0.2em]"
                            style={currentPageColor !== "text-primary" ? { color: currentPageColor } : undefined}
                        >
                            {currentPage}
                        </BreadcrumbPage>
                    </BreadcrumbItemUI>
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}