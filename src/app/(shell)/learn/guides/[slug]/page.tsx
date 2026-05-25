import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGuide, getAllGuides, generateGuideMetadata } from "@/lib/guides-data";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";

const BASE_URL = "https://stars.guide";

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return generateGuideMetadata(guide);
}

function parseContentToSections(content: string) {
  // Strip the leading/trailing whitespace and split by section tags
  const sections: { id: string; title: string; content: string }[] = [];
  const regex = /<section id="([^"]+)">\s*<h2>([^<]+)<\/h2>\s*(.*?)<\/section>/gs;
  let match;
  while ((match = regex.exec(content)) !== null) {
    sections.push({
      id: match[1],
      title: match[2],
      content: match[3].trim(),
    });
  }
  return sections;
}

function renderContent(html: string): string {
  return html
    .replace(/<strong>([^<]+)<\/strong>/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/<em>([^<]+)<\/em>/g, '<em class="text-white/70 italic">$1</em>')
    .replace(/<blockquote>/g, '<blockquote class="border-l-2 border-primary pl-6 py-3 my-6">')
    .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-2 text-white/70 my-4">')
    .replace(/<\/ul>/g, '')
    .replace(/<li>/g, '<li class="text-white/70">')
    .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-2 text-white/70 my-4">')
    .replace(/<\/ol>/g, '');
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  const sections = parseContentToSections(guide.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    image: `${BASE_URL}/og-image.png`,
    author: {
      "@type": "Organization",
      name: "stars.guide",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "stars.guide",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/apple-icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/guides/${slug}`,
    },
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    keywords: guide.secondaryKeywords.join(", "),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Learn",
        item: `${BASE_URL}/learn`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Guides",
        item: `${BASE_URL}/learn/guides`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: guide.title,
        item: `${BASE_URL}/learn/guides/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-12 pt-8 pb-32">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Learn", href: "/learn" },
            { label: "Guides", href: "/learn/guides" },
          ]}
          currentPage={guide.title}
          showBorder={false}
        />

        {/* Hero */}
        <header className="mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
            {guide.readingTimeMinutes} min read · Updated {guide.updatedAt}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-4">
            {guide.title}
          </h1>
          <p className="text-xl text-white/60 font-serif">
            {guide.subtitle}
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="mb-16 border border-white/10 bg-black/50 rounded-md p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
            In This Guide
          </p>
          <ol className="space-y-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-white/60 hover:text-primary transition-colors text-sm flex items-center gap-3"
                >
                  <span className="font-mono text-white/30 text-xs">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <article className="space-y-16">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-3xl font-serif text-white mb-6 border-b border-white/10 pb-4">
                {section.title}
              </h2>
              <div
                className="prose prose-invert prose-lg max-w-none text-white/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderContent(section.content) }}
              />
            </section>
          ))}
        </article>

        {/* FAQ Section */}
        {guide.faqs.length > 0 && (
          <section className="mt-24 border border-white/10 bg-black/50 rounded-md p-8">
            <h2 className="text-3xl font-serif text-white mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {guide.faqs.map((faq, i) => (
                <div key={i} className="border-b border-white/10 pb-6 last:border-0">
                  <h3 className="text-lg font-medium text-white mb-3">{faq.question}</h3>
                  <p className="text-white/60 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Navigation to other guides */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <Link href="/learn/guides" className="text-primary/80 hover:text-primary transition-colors">
            ← All Guides
          </Link>
        </div>
      </div>
    </>
  );
}