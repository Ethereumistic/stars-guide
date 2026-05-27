import { Metadata } from "next";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";

const BASE_URL = "https://stars.guide";

export const metadata: Metadata = {
  title: "Cosmic Events",
  description:
    "Coverage of major astrological events — eclipses, planetary alignments, retrogrades, and more. Stars.guide.",
  alternates: {
    canonical: `${BASE_URL}/blog/cosmic-events`,
  },
};

export default function CosmicEventsPage() {
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Cosmic Events" },
        ]}
        currentPage="Cosmic Events"
        showBorder={false}
      />
      <section className="mb-16">
        <h1 className="text-5xl md:text-6xl font-serif text-white mb-4">Cosmic Events</h1>
        <p className="text-lg text-white/60 max-w-2xl">
          In-depth coverage of eclipses, planetary alignments, Mercury retrograde periods, and major astrological transits.
        </p>
      </section>
      <p className="text-white/40 font-mono text-sm uppercase tracking-widest">
        First cosmic events articles coming in Month 2 of the editorial calendar.
      </p>
    </div>
  );
}