import { Metadata } from "next";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";

const BASE_URL = "https://stars.guide";

export const metadata: Metadata = {
  title: "Lifestyle & Zodiac",
  description:
    "Astrology lifestyle content — horoscope styling, zodiac fashion, relationship dynamics, and living in alignment with your sign.",
  alternates: {
    canonical: `${BASE_URL}/blog/lifestyle`,
  },
};

export default function LifestylePage() {
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Lifestyle" },
        ]}
        currentPage="Lifestyle"
        showBorder={false}
      />
      <section className="mb-16">
        <h1 className="text-5xl md:text-6xl font-serif text-white mb-4">Lifestyle &amp; Zodiac</h1>
        <p className="text-lg text-white/60 max-w-2xl">
          Fashion, relationships, home design, and daily practices aligned with your zodiac sign. Lifestyle content for the modern stargazer.
        </p>
      </section>
      <p className="text-white/40 font-mono text-sm uppercase tracking-widest">
        First lifestyle articles coming in Month 2 of the editorial calendar.
      </p>
    </div>
  );
}