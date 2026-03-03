"use client";

import Link from "next/link";
import { motion } from "motion/react";
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
    animate?: boolean;
}

export function PageBreadcrumbs({
    items,
    currentPage,
    currentPageColor = "text-primary",
    showBorder = true,
    animate = true,
}: PageBreadcrumbsProps) {
    const content = (
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
    );

    if (animate) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-12 md:mb-16"
            >
                {content}
            </motion.div>
        );
    }

    return (
        <div className="mb-12 md:mb-16">
            {content}
        </div>
    );
}
