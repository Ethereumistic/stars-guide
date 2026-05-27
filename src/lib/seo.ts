/**
 * SEO utilities for stars.guide
 *
 * Shared helpers for building Next.js Metadata objects and Schema.org JSON-LD
 * structured data. Used by layout.tsx wrappers across all public pages.
 */

import type { Metadata } from "next";
import { buildOgImageUrl } from "@/lib/seo/og";

const SITE_NAME = "Stars Guide";
const SITE_URL = "https://stars.guide";
const SITE_DESCRIPTION =
  "Celestial horoscopes and birth charts. Discover your destiny with stars.guide.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/api/og?title=Stars+Guide&subtitle=Navigate+your+fate`;

// ── Metadata builders ────────────────────────────────────────────────

interface PageMetaOptions {
  title: string;
  description: string;
  path: string; // e.g. "/horoscopes/aries"
  ogImage?: string;
  /** OG image API params — overrides ogImage if provided */
  ogImageOpts?: { title: string; subtitle?: string; type?: import("@/lib/seo/og").OgType; typeId?: string };
  noIndex?: boolean;
}

/**
 * Build a full Metadata object for a page.
 *
 * The `title` is passed as-is to `metadata.title` so the root layout's
 * template ("%s | stars.guide") applies it. For openGraph/twitter we
 * append the site name explicitly since those fields don't use templates.
 */
export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  ogImageOpts,
  noIndex = false,
}: PageMetaOptions): Metadata {
  const url = `${SITE_URL}${path}`;
  const image = ogImageOpts
    ? buildOgImageUrl(ogImageOpts)
    : ogImage || DEFAULT_OG_IMAGE;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}

/** Convenience: static metadata for pages with no dynamic segments. */
export function staticMetadata(
  title: string,
  description: string,
  path: string,
  opts?: Omit<PageMetaOptions, "title" | "description" | "path">,
): Metadata {
  return buildMetadata({ title, description, path, ...opts });
}

// ── Schema.org JSON-LD data builders ─────────────────────────────────

/** WebSite schema for homepage. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/horoscopes?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  } as const;
}

/** Organization schema for homepage. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://twitter.com/starsguide",
      "https://instagram.com/starsguide",
    ],
  } as const;
}

/** Article schema for learn detail pages. */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    image: opts.image || DEFAULT_OG_IMAGE,
    datePublished: opts.datePublished || "2025-01-01",
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  } as const;
}

/** FAQPage schema for the Oracle page. */
export function faqSchema(
  faqs: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  } as const;
}

/** BreadcrumbList schema — useful on any nested page. */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  } as const;
}

/** Person schema for profile pages. */
export function personSchema(opts: {
  username: string;
  path: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `@${opts.username}`,
    url: `${SITE_URL}${opts.path}`,
    description:
      opts.description ||
      `${opts.username}'s birth chart and astrological profile on ${SITE_NAME}.`,
  } as const;
}

// ── Title formatters ──────────────────────────────────────────────────

/** Capitalize first letter of a slug segment (e.g. "aries" → "Aries"). */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Format a YYYY-MM-DD date string for display in titles. */
export function formatDateForTitle(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}