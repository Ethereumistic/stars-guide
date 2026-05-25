import type { Metadata } from "next";
import { buildMetadata, capitalize, articleSchema } from "@/lib/seo";

interface Props {
  params: Promise<{ element: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { element } = await params;
  const elementName = capitalize(element);

  const descriptions: Record<string, string> = {
    fire: "Fire signs (Aries, Leo, Sagittarius) — passion, action, and inspiration. Learn about the Fire element's temperament and influence on stars.guide.",
    earth: "Earth signs (Taurus, Virgo, Capricorn) — stability, pragmatism, and material mastery. Learn about the Earth element's temperament on stars.guide.",
    air: "Air signs (Gemini, Libra, Aquarius) — intellect, communication, and social connection. Learn about the Air element's temperament on stars.guide.",
    water: "Water signs (Cancer, Scorpio, Pisces) — emotion, intuition, and depth. Learn about the Water element's temperament on stars.guide.",
  };

  return buildMetadata({
    title: `${elementName} Element in Astrology | Stars Guide`,
    description: descriptions[element.toLowerCase()] || `${elementName} element — explore its zodiac signs, traits, and influence on stars.guide.`,
    path: `/learn/elements/${element}`,
  });
}

export function generateStaticParams() {
  return [
    { element: "fire" },
    { element: "earth" },
    { element: "air" },
    { element: "water" },
  ];
}

export default function ElementDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}