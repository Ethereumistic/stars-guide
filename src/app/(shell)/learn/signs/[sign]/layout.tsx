import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

interface Props {
  params: Promise<{ sign: string }>;
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign } = await params;
  const signName = SIGN_NAMES[sign] || sign;
  const dates = SIGN_DATES[sign] || "";

  return buildMetadata({
    title: `${signName} — Zodiac Sign Traits, Dates & Meaning`,
    description: `Discover ${signName}: traits, strengths, ruling planet, and element. Deep-dive into the zodiac's ${signName} archetype on stars.guide.`,
    path: `/learn/signs/${sign}`,
    ogImage: buildOgImageUrl({
      title: signName,
      subtitle: `${dates} • The Zodiac`,
      type: "sign",
      typeId: sign,
    }),
  });
}

export default function SignDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}