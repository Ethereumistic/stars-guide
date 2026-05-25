import type { Metadata } from "next";
import { buildMetadata, capitalize, breadcrumbSchema } from "@/lib/seo";
import { compositionalSigns } from "@/astrology/signs";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ sign: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign } = await params;
  const signName = capitalize(sign);
  const signData = compositionalSigns.find((s) => s.id === sign.toLowerCase());
  if (!signData) return {};

  return buildMetadata({
    title: `${signName} Daily Horoscope | Stars Guide`,
    description: `Today's ${signName} horoscope — ${signData.traits}. Free daily astrological insights for ${signName} (${signData.dates}) on stars.guide.`,
    path: `/horoscopes/${sign}`,
  });
}

export function generateStaticParams() {
  return compositionalSigns.map((s) => ({ sign: s.id }));
}

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children;
}