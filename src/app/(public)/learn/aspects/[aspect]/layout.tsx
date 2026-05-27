import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

interface Props {
  params: Promise<{ aspect: string }>;
}

const ASPECT_NAMES: Record<string, string> = {
  conjunction: "Conjunction",
  sextile: "Sextile",
  square: "Square",
  trine: "Trine",
  opposition: "Opposition",
  semisextile: "Semi-Sextile",
  quincunx: "Quincunx",
  semisquare: "Semi-Square",
  sesquiquadrate: "Sesquiquadrate",
  quintile: "Quintile",
  biquintile: "Bi-Quintile",
};

const ASPECT_DESC: Record<string, string> = {
  conjunction: "Planets in the same degree merge their energies — powerful fusion of intent.",
  sextile: "A 60° harmony — supportive flow between complementary elements.",
  square: "A 90° tension — dynamic friction that drives growth and change.",
  trine: "A 120° harmony — effortless talent and natural gifts between compatible elements.",
  opposition: "A 180° polarity — awareness through contrast and conscious integration.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { aspect } = await params;
  const name = ASPECT_NAMES[aspect] || aspect;
  const desc = ASPECT_DESC[aspect] || `Learn about the ${name} aspect in astrology on stars.guide.`;

  return buildMetadata({
    title: `${name} Aspect — Meaning, Degrees & Interpretation`,
    description: desc,
    path: `/learn/aspects/${aspect}`,
    ogImage: buildOgImageUrl({
      title: `${name} Aspect`,
      subtitle: "Astrological Geometry",
    }),
  });
}

export default function AspectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}