import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Learn Astrology | Stars Guide",
  description:
    "Explore the celestial archive — zodiac signs, planets, houses, aspects, and elements. Learn the foundations of astrology on stars.guide.",
  path: "/learn",
});

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}