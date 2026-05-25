import { Metadata } from "next";
import { motion } from "motion/react";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { GuidesList } from "@/components/learn/guides/guides-list";
import { getAllGuides } from "@/lib/guides-data";

const BASE_URL = "https://stars.guide";

export const metadata: Metadata = {
  title: "Astrology Guides",
  description:
    "Evergreen astrology guides from stars.guide — birth charts, sun/moon/rising signs, Mercury retrograde, and more. Expert beginner-friendly content.",
  openGraph: {
    title: "Astrology Guides | stars.guide",
    description:
      "Evergreen astrology guides — birth charts, Mercury retrograde, and the Big Three signs.",
    url: `${BASE_URL}/learn/guides`,
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/learn/guides`,
  },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Learn", href: "/learn" },
          { label: "Guides" },
        ]}
        currentPage="Guides"
        showBorder={false}
      />

      <section className="mb-16">
        <h1 className="text-5xl md:text-6xl font-serif text-white mb-4">
          Astrology Guides
        </h1>
        <p className="text-lg text-white/60 max-w-2xl">
          Evergreen reference guides for understanding the fundamental systems
          of astrology — from birth charts to the Big Three signs to navigating
          Mercury retrograde.
        </p>
      </section>

      <GuidesList guides={guides} />
    </div>
  );
}