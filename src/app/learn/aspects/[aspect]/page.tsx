"use client";

import { compositionalAspects } from "@/astrology/aspects";
import { aspectUIConfig } from "@/config/aspects-ui";
import { useParams, notFound } from "next/navigation";
import { TbCircleDot, TbRuler, TbWaveSine, TbStar } from "react-icons/tb";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import {
    AspectTitleBlock,
    AspectSpecsGrid,
    AspectEssence,
    AspectGraphic,
    AspectDevelopmentalArc,
    AspectInterpretiveContexts,
    AspectTechnicalData,
} from "@/components/learn/aspects";
import { AspectRealTimeCard } from "@/components/learn/aspects/aspect-real-time-card";

const natureLabels: Record<string, string> = {
    soft: "Harmonious",
    hard: "Challenging",
    neutral: "Neutral",
    variable: "Variable",
};

export default function AspectDetailPage() {
    const params = useParams();
    const aspectId = params.aspect as string;

    const data = compositionalAspects.find(a => a.id === aspectId);
    const ui = aspectUIConfig[aspectId];

    if (!data || !ui) {
        return notFound();
    }

    const hexColor = ui.hexFallback;

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">

            {/* Ambient Base Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.12] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${hexColor} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">

                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Learn", href: "/learn" },
                        { label: "Aspects", href: "/learn/aspects" },
                    ]}
                    currentPage={`${data.name} // ${data.category.toUpperCase()}`}
                    currentPageColor={hexColor}
                />

                {/* ── Hero ────────────────────────────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    <div className="lg:col-span-5 space-y-12">
                        <AspectTitleBlock data={data} ui={ui} />

                        <AspectSpecsGrid
                            specs={[
                                {
                                    label: "Degrees",
                                    value: data.degreesExact,
                                    icon: TbRuler,
                                    subValue: data.fraction,
                                },
                                {
                                    label: "Nature",
                                    value: natureLabels[data.nature] ?? data.nature,
                                    icon: TbWaveSine,
                                    subValue: data.category,
                                },
                                {
                                    label: "Harmonic",
                                    value: `${data.harmonicNumber}th`,
                                    icon: TbCircleDot,
                                    subValue: `Orb ${data.orb.standard}°`,
                                },
                                {
                                    label: "Tradition",
                                    value: data.ptolemaic
                                        ? "Ptolemaic"
                                        : data.keplerIntroduced
                                            ? "Keplerian"
                                            : "Harmonic",
                                    icon: TbStar,
                                    subValue: "",
                                },
                            ]}
                        />

                        <AspectEssence essence={data.psychologicalFunction} />
                    </div>

                    <AspectGraphic data={data} ui={ui} size="large" />
                </section>

                {/* ── Structured Data Grid ────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ">

                    <div className="flex flex-col gap-8">
                        <AspectDevelopmentalArc data={data} ui={ui} />
                        <AspectRealTimeCard data={data} ui={ui} />
                    </div>
                    <div className="flex flex-col gap-8">
                        <AspectInterpretiveContexts data={data} ui={ui} />
                        <AspectTechnicalData data={data} ui={ui} />
                    </div>

                </div>

                <SystemArchiveLinkages category="aspects" currentId={data.id} />

            </div>
        </div>
    );
}
