import type { Metadata } from "next";
import { buildMetadata, capitalize, articleSchema } from "@/lib/seo";
import { compositionalSigns } from "@/astrology/signs";
import { JsonLd } from "@/components/seo/json-ld";

interface Props {
  params: Promise<{ sign: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign } = await params;
  const signName = capitalize(sign);
  const signData = compositionalSigns.find((s) => s.id === sign.toLowerCase());
  if (!signData) return {};

  return buildMetadata({
    title: `${signName} Zodiac Sign — Traits, Dates & Meaning | Stars Guide`,
    description: `${signName} zodiac sign: ${signData.traits}. Explore ${signName}'s element, modality, ruling planet, strengths, weaknesses, and core archetype on stars.guide.`,
    path: `/learn/signs/${sign}`,
  });
}

export function generateStaticParams() {
  return compositionalSigns.map((s) => ({ sign: s.id }));
}

export default function SignDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}