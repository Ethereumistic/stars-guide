import type { Metadata } from "next";
import { staticMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata = staticMetadata(
  "Elements, Modes & Polarity",
  "Fire, Earth, Air, Water — the primal forces shaping every sign. Explore the four elements, three modalities, and Yang-Yin polarity.",
  "/learn/elements",
  {
    ogImage: buildOgImageUrl({
      title: "Elements & Modes",
      subtitle: "The Primal Forces",
    }),
  },
);

export default function ElementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}