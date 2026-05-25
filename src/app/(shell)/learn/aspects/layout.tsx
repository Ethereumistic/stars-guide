import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Aspects in Astrology | Stars Guide",
  description:
    "Explore astrological aspects — conjunctions, squares, trines, oppositions, and more. Learn the sacred geometry between planets on stars.guide.",
  path: "/learn/aspects",
});

export default function AspectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}