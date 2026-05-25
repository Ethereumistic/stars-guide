import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";
import { SIGN_COLORS } from "@/lib/seo/og";

// All 12 zodiac sign slugs — must match src/astrology/signs.ts
const SIGN_SLUGS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

// Map sign slug → display name for metadata
const SIGN_NAMES: Record<string, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

// Map sign slug → element for subtitle
const SIGN_DATES: Record<string, string> = {
  aries: "March 21 - April 19",
  taurus: "April 20 - May 20",
  gemini: "May 21 - June 20",
  cancer: "June 21 - July 22",
  leo: "July 23 - August 22",
  virgo: "August 23 - September 22",
  libra: "September 23 - October 22",
  scorpio: "October 23 - November 21",
  sagittarius: "November 22 - December 21",
  capricorn: "December 22 - January 19",
  aquarius: "January 20 - February 18",
  pisces: "February 19 - March 20",
};

interface Props {
  params: Promise<{ sign: string; date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign, date } = await params;
  const signName = SIGN_NAMES[sign] || sign;
  const dateStr = date || "today";

  return buildMetadata({
    title: `${signName} Daily Horoscope — ${dateStr}`,
    description: `Read your free ${signName} daily horoscope for ${dateStr} on stars.guide. Astrological insights, planetary transits, and cosmic guidance.`,
    path: `/horoscopes/${sign}/${date}`,
    ogImage: buildOgImageUrl({
      title: `${signName} Daily Horoscope`,
      subtitle: dateStr === "today" ? SIGN_DATES[sign] || "" : dateStr,
      type: "horoscope",
      typeId: sign,
      extras: { date: dateStr },
    }),
  });
}

export default function HoroscopeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}