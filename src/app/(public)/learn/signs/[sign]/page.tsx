import { Metadata } from "next";
import { notFound } from "next/navigation";
import { compositionalSigns } from "@/astrology/signs";
import { SignDetailClient } from "./SignDetailClient";
import { SignSEOContent } from "./SignSEOContent";

const BASE_URL = "https://stars.guide";

// Compatibility descriptions for JSON-LD
const SIGN_COMPATIBILITY: Record<string, { bestMatch: string; worstMatch: string }> = {
  aries: { bestMatch: "Leo, Sagittarius, Gemini", worstMatch: "Cancer, Capricorn, Libra" },
  taurus: { bestMatch: "Virgo, Capricorn, Cancer", worstMatch: "Aquarius, Leo, Aries" },
  gemini: { bestMatch: "Libra, Aquarius, Aries", worstMatch: "Virgo, Pisces, Scorpio" },
  cancer: { bestMatch: "Scorpio, Pisces, Taurus", worstMatch: "Aries, Libra, Capricorn" },
  leo: { bestMatch: "Aries, Sagittarius, Gemini", worstMatch: "Taurus, Scorpio, Capricorn" },
  virgo: { bestMatch: "Taurus, Capricorn, Cancer", worstMatch: "Gemini, Sagittarius, Pisces" },
  libra: { bestMatch: "Gemini, Aquarius, Leo", worstMatch: "Cancer, Capricorn, Aries" },
  scorpio: { bestMatch: "Cancer, Pisces, Virgo", worstMatch: "Leo, Aquarius, Taurus" },
  sagittarius: { bestMatch: "Aries, Leo, Libra", worstMatch: "Virgo, Pisces, Cancer" },
  capricorn: { bestMatch: "Taurus, Virgo, Cancer", worstMatch: "Aries, Libra, Sagittarius" },
  aquarius: { bestMatch: "Gemini, Libra, Sagittarius", worstMatch: "Taurus, Scorpio, Cancer" },
  pisces: { bestMatch: "Cancer, Scorpio, Taurus", worstMatch: "Gemini, Sagittarius, Leo" },
};

export async function generateStaticParams() {
  return compositionalSigns.map((sign) => ({ sign: sign.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sign: string }>;
}): Promise<Metadata> {
  const { sign } = await params;
  const signData = compositionalSigns.find((s) => s.id === sign);

  if (!signData) return {};

  const title = `Complete Guide to ${signData.name}: Traits, Compatibility, and More`;
  const description = `Discover ${signData.name}'s personality traits, strengths, weaknesses, love compatibility, career guidance, and ruling planet. Expert astrology insights for ${signData.name} (${signData.dates}).`;

  return {
    title,
    description,
    keywords: [
      `${signData.name} zodiac sign`,
      `${signData.name} traits`,
      `${signData.name} personality`,
      `${signData.name} compatibility`,
      `${signData.name} horoscope`,
      `${signData.name} career`,
      `${signData.name} strengths`,
      `${signData.name} weaknesses`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/learn/signs/${sign}`,
      type: "article",
      images: [
        {
          url: `/og-sign-${sign}.png`,
          width: 1200,
          height: 630,
          alt: `${signData.name} - Complete Astrology Guide`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/learn/signs/${sign}`,
    },
  };
}

export default async function SignDetailPage({
  params,
}: {
  params: Promise<{ sign: string }>;
}) {
  const { sign } = await params;
  const signData = compositionalSigns.find((s) => s.id === sign);

  if (!signData) {
    notFound();
  }

  const compatibility = SIGN_COMPATIBILITY[sign] ?? { bestMatch: "", worstMatch: "" };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Complete Guide to ${signData.name}: Traits, Compatibility, and More`,
    description: `Discover ${signData.name}'s personality traits, strengths, weaknesses, love compatibility, career guidance, and ruling planet.`,
    image: `${BASE_URL}/og-sign-${sign}.png`,
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
      "@id": `${BASE_URL}/learn/signs/${sign}`,
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    about: {
      "@type": "Thing",
      name: signData.name,
      description: signData.essenceFull,
    },
    keywords: [
      signData.name,
      "zodiac sign",
      signData.element,
      signData.modality,
      ...signData.strengths,
      ...signData.weaknesses,
    ].join(", "),
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
        name: "Signs",
        item: `${BASE_URL}/learn/signs`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: signData.name,
        item: `${BASE_URL}/learn/signs/${sign}`,
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
      <SignDetailClient signId={sign} />
      <SignSEOContent signId={sign} />
    </>
  );
}