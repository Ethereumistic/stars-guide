import type { Metadata } from "next";
import { staticMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata = staticMetadata(
  "Zodiac Signs — The Twelve Archetypes",
  "Explore all 12 zodiac signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces. Discover traits, dates, and ruling planets.",
  "/learn/signs",
  {
    ogImage: buildOgImageUrl({
      title: "The Twelve Guardians",
      subtitle: "Zodiac Signs on stars.guide",
    }),
  },
);

export default function SignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}