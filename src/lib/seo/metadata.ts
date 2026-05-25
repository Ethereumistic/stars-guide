import { Metadata } from "next";

export type PageType = "home" | "horoscope" | "learn" | "profile" | "oracle" | "journal" | "dashboard" | "admin" | "blog";

interface PageMetadataOptions {
  type: PageType;
  title?: string;
  description?: string;
  sign?: string;
  topic?: string;
  username?: string;
  date?: string;
  ogImage?: string;
  noIndex?: boolean;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildMetadata(opts: PageMetadataOptions): Metadata {
  const { type, title, description, sign, topic, username, date, ogImage, noIndex } = opts;

  const baseTitle = "Stars Guide";
  const baseDesc = "Your daily source for astrology, horoscopes, birth chart analysis, and cosmic guidance.";

  let pageTitle = title ?? baseTitle;
  let pageDesc = description ?? baseDesc;

  if (type === "horoscope" && sign) {
    const dateLabel = date ? ` - ${date}` : "";
    pageTitle = `${capitalize(sign)} Daily Horoscope${dateLabel} | Stars Guide`;
    pageDesc = `Today's astrology forecast for ${sign}. Planetary positions, love, career, and wellness predictions tailored to your zodiac sign.`;
  } else if (type === "learn" && topic) {
    pageTitle = `${capitalize(topic)} - Astrology Guide | Stars Guide`;
    pageDesc = `Learn about ${topic} in astrology. Comprehensive guide covering ${topic} meaning, influences, and how it affects your birth chart.`;
  } else if (type === "profile" && username) {
    pageTitle = `${username} | Stars Guide`;
    pageDesc = `View ${username}'s public astrology profile on Stars Guide.`;
  } else if (type === "oracle") {
    pageTitle = "AI Astrology Oracle - Ask the Stars | Stars Guide";
    pageDesc = "Ask the AI Astrology Oracle anything about your horoscope, birth chart, zodiac sign, or cosmic timing.";
  } else if (type === "home") {
    pageTitle = "stars.guide | Navigate your fate";
    pageDesc = "Discover your destiny with celestial horoscopes, AI-powered oracle, and personalized birth chart analysis.";
  }

  return {
    title: pageTitle,
    description: pageDesc,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      type: type === "blog" ? "article" : "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      siteName: "Stars Guide",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
      images: ogImage ? [ogImage] : [],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}