"use client";

import { compositionalAspects } from "@/astrology/aspects";
import { aspectUIConfig } from "@/config/aspects-ui";
import { motion, Variants } from "motion/react";
import { CompactAspectCard } from "@/components/learn/aspects";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useEffect } from "react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

function useCenterCard(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const updateActiveCard = () => {
      const cards = container.querySelectorAll("[data-card-index]");
      const viewportCenter = window.innerHeight / 2;

      let closestIndex = -1;
      let closestDistance = Infinity;

      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = parseInt(
            (card as HTMLElement).dataset.cardIndex || "-1",
            10,
          );
        }
      });

      setActiveIndex(closestIndex);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveCard();
        });
        ticking = true;
      }
    };

    updateActiveCard();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [itemCount]);

  return { activeIndex, containerRef };
}

const categoryFilters = [
  { value: "all", label: "All" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "harmonic", label: "Harmonic" },
];

const mergedAspects = compositionalAspects.map((data) => ({
  data,
  ui: aspectUIConfig[data.id] || aspectUIConfig["conjunction"],
}));

export default function AspectsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredAspects =
    activeTab === "all"
      ? mergedAspects
      : mergedAspects.filter((a) => a.data.category === activeTab);

  const { activeIndex, containerRef } = useCenterCard(filteredAspects.length);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Learn", href: "/learn" },
          { label: "Aspects" },
        ]}
        title="Celestial"
        subtitle="Angles"
        customFilter={
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-fit rounded-md mx-auto md:mx-0"
          >
            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-2 justify-center">
              {categoryFilters.map((filter) => (
                <TabsTrigger
                  key={filter.value}
                  value={filter.value}
                  className="relative w-16 md:w-20 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                >
                  <span className="font-mono text-xs uppercase tracking-wider">
                    {filter.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        filterLabel="Filter by Category"
      />

      {/* Grid */}
      <motion.div
        ref={containerRef}
        key={activeTab}
        className={`grid gap-4 md:gap-6 mx-auto ${
          filteredAspects.length === 1
            ? "grid-cols-1 max-w-sm"
            : filteredAspects.length === 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
              : filteredAspects.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredAspects.map(({ data, ui }, index) => (
          <div key={data.id} data-card-index={index}>
            <CompactAspectCard
              data={data}
              ui={ui}
              isActive={index === activeIndex}
              href={`/learn/aspects/${data.id}`}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
