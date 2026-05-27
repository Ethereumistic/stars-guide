import type { Metadata } from "next";
import { staticMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata = staticMetadata(
  "Aspects — Geometric Wisdom",
  "Conjunctions, squares, trines, and oppositions — the sacred geometry between planets revealing internal conflicts and natural talents.",
  "/learn/aspects",
  {
    ogImage: buildOgImageUrl({
      title: "Aspects",
      subtitle: "Sacred Geometry of the Sky",
    }),
  },
);

export default function AspectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}