import type { Metadata } from "next";
import { staticMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata = staticMetadata(
  "Celestial Archive — Learn Astrology",
  "Explore zodiac signs, planets, houses, aspects, and elements. Your complete guide to astrology 101 on stars.guide.",
  "/learn",
  {
    ogImage: buildOgImageUrl({
      title: "Celestial Archive",
      subtitle: "Learn Astrology on stars.guide",
    }),
  },
);

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}