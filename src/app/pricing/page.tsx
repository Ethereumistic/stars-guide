"use client";

import { motion } from "motion/react";
import React, { useState } from "react";
import { TbSparkles } from "react-icons/tb";
import { PricingCard } from "@/components/pricing/pricing-card";
import { plans } from "@/components/pricing/pricing-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StardustPurchaseV1 } from "@/components/pricing/stardust-purchase-v1";
import { StardustPurchaseV5 } from "@/components/pricing/stardust-purchase-v5";
import { PageHeader } from "@/components/layout/page-header";
import { StardustPurchase } from "@/components/pricing/stardust-purchase";

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);
    const billingValue = isYearly ? "yearly" : "monthly";

    return (
        <div className="relative min-h-screen w-full text-foreground selection:bg-primary/30">
            <main className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                <PageHeader
                    breadcrumbs={[
                        { label: "Home", href: "/" },
                        { label: "Pricing" },
                    ]}
                    title="Choose Your"
                    subtitle="Orbit"
                    showElementFilter={false}
                    customFilter={
                        <Tabs
                            value={billingValue}
                            onValueChange={(value) => setIsYearly(value === "yearly")}
                            className="w-auto"
                        >
                            <TabsList className="relative flex items-center p-1 bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm h-auto">
                                <TabsTrigger
                                    value="monthly"
                                    className="relative w-32 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                >
                                    Monthly
                                </TabsTrigger>
                                <TabsTrigger
                                    value="yearly"
                                    className="relative w-32 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                >
                                    Yearly
                                    <span className="absolute -top-3 -right-2 bg-primary text-[#0A0F1A] text-[10px] font-bold px-2 py-0.5 rounded-full rotate-3 shadow-md">
                                        -44%
                                    </span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    }
                    filterLabel="Billing Cycle"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch w-full max-w-7xl mx-auto">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`relative w-full h-full hover:z-50 [transition:z-index_0ms_linear_1000ms] hover:[transition:z-index_0ms_linear_0ms] ${i === 1 ? 'lg:-translate-y-4 z-10' : 'z-0'}`}
                        >
                            <PricingCard plan={plan} index={i} isYearly={isYearly} />
                        </div>
                    ))}
                </div>

                <StardustPurchaseV1 />

            </main>
        </div>
    );
}