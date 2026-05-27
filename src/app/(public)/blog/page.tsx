import { Metadata } from "next";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";

const BASE_URL = "https://stars.guide";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Astrology articles, cosmic event coverage, and lifestyle content from stars.guide.",
  openGraph: {
    title: "stars.guide Blog",
    description:
      "Astrology articles, cosmic event coverage, and lifestyle content.",
    url: `${BASE_URL}/blog`,
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
};

export default function BlogPage() {
  // Placeholder listing — populated in Month 2+ when blog content is written
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Blog" },
        ]}
        currentPage="Blog"
        showBorder={false}
      />

      <section className="mb-16">
        <h1 className="text-5xl md:text-6xl font-serif text-white mb-4">Blog</h1>
        <p className="text-lg text-white/60 max-w-2xl">
          Astrology articles, cosmic event guides, and lifestyle content coming
          in Month 2 of our editorial calendar.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {["Cosmic Events", "Lifestyle & Zodiac", "Horoscope Deep Dives"].map((category) => (
          <div
            key={category}
            className="border border-white/10 bg-black/50 rounded-md p-8 text-center"
          >
            <p className="text-white/40 font-mono text-xs uppercase tracking-widest mb-2">
              Coming Soon
            </p>
            <h2 className="text-xl font-serif text-white">{category}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}