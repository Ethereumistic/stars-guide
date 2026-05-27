import type { Metadata } from "next";
import { buildMetadata, capitalize, articleSchema } from "@/lib/seo";
import { compositionalPlanets } from "@/astrology/planets";

interface Props {
  params: Promise<{ planet: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { planet } = await params;
  const planetName = capitalize(planet);
  const planetData = compositionalPlanets.find(
    (p) => p.id === planet.toLowerCase(),
  );
  if (!planetData) return {};

  return buildMetadata({
    title: `${planetName} in Astrology — Meaning & Influence`,
    description: `${planetName}: ${planetData.domain}. Discover ${planetName}'s psychological function, core drives, and shadow expression on stars.guide.`,
    path: `/learn/planets/${planet}`,
  });
}

export function generateStaticParams() {
  return compositionalPlanets.map((p) => ({ planet: p.id }));
}

export default function PlanetDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}