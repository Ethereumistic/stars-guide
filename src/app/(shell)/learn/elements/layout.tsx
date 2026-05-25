import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Elements, Modes & Polarity | Stars Guide",
  description:
    "Explore the four elements (Fire, Earth, Air, Water), three modalities, and polarity that shape every zodiac sign's temperament on stars.guide.",
  path: "/learn/elements",
});

export default function ElementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}