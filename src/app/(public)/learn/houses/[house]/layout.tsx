import type { Metadata } from "next";
import { buildMetadata, articleSchema } from "@/lib/seo";
import { compositionalHouses } from "@/astrology/houses";

interface Props {
  params: Promise<{ house: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { house } = await params;
  const houseNum = parseInt(house, 10);
  const houseData = compositionalHouses.find((h) => h.id === houseNum);
  if (!houseData) return {};

  return buildMetadata({
    title: `${houseData.name} — ${houseData.archetypeName}`,
    description: `${houseData.name}: ${houseData.developmentalTheme}. Explore the ${houseData.name} meaning, natural sign (${houseData.naturalSign}), and life arena on stars.guide.`,
    path: `/learn/houses/${house}`,
  });
}

export function generateStaticParams() {
  return compositionalHouses.map((h) => ({ house: String(h.id) }));
}

export default function HouseDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}