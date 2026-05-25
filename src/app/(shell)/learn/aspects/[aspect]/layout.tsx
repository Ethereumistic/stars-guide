import type { Metadata } from "next";
import { buildMetadata, capitalize, articleSchema } from "@/lib/seo";
import { compositionalAspects } from "@/astrology/aspects";

interface Props {
  params: Promise<{ aspect: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { aspect } = await params;
  const aspectData = compositionalAspects.find(
    (a) => a.id === aspect.toLowerCase(),
  );
  if (!aspectData) return {};

  return buildMetadata({
    title: `${aspectData.name} Aspect — Meaning & Orb | Stars Guide`,
    description: `${aspectData.name}: ${aspectData.degreesExact} aspect — ${aspectData.coreKeywords?.join(", ") || "astrological aspect"}. Learn the meaning and orb of the ${aspectData.name} on stars.guide.`,
    path: `/learn/aspects/${aspect}`,
  });
}

export function generateStaticParams() {
  return compositionalAspects.map((a) => ({ aspect: a.id }));
}

export default function AspectDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}