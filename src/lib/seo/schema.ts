// ─────────────────────────────────────────────────────────────────────────────
// Schema.org structured data builders for stars.guide
// Produces JSON-LD compatible objects for embedding in <script type="application/ld+json">
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = "https://stars.guide";
const SITE_NAME = "Stars Guide";
const DEFAULT_DESCRIPTION =
  "Your daily source for astrology, horoscopes, birth chart analysis, and cosmic guidance.";

// ── BreadcrumbList Schema ──────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── WebSite Schema ──────────────────────────────────────────────────────────

export interface WebsiteSchemaOptions {
  name?: string;
  url?: string;
  description?: string;
}

export function buildWebSiteSchema(options: WebsiteSchemaOptions = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: options.name || SITE_NAME,
    url: options.url || SITE_URL,
    description: options.description || DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/horoscopes/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── Organization Schema ─────────────────────────────────────────────────────

export interface OrganizationSchemaOptions {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export function buildOrganizationSchema(options: OrganizationSchemaOptions = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: options.name || SITE_NAME,
    url: options.url || SITE_URL,
    logo: options.logo
      ? { "@type": "ImageObject", url: options.logo }
      : { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    ...(options.sameAs && { sameAs: options.sameAs }),
  };
}

// ── Article Schema ──────────────────────────────────────────────────────────

export interface ArticleSchemaOptions {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
}

export function buildArticleSchema(opts: ArticleSchemaOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: {
      "@type": "Person",
      name: opts.author ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  };
}

// ── FAQPage Schema ──────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export function buildFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}