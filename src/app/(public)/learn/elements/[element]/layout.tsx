import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

interface Props {
  params: Promise<{ element: string }>;
}

const ELEMENT_NAMES: Record<string, string> = {
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  water: "Water",
};

const ELEMENT_DESC: Record<string, string> = {
  fire: "Passionate, inspiring, and driven. Aries, Leo, and Sagittarius channel the primal force of Fire.",
  earth: "Practical, reliable, and grounded. Taurus, Virgo, and Capricorn embody Earth's stability.",
  air: "Intellectual, communicative, and objective. Gemini, Libra, and Aquarius carry Air's clarity.",
  water: "Intuitive, emotional, and empathetic. Cancer, Scorpio, and Pisces flow with Water's depth.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { element } = await params;
  const name = ELEMENT_NAMES[element] || element;
  const desc = ELEMENT_DESC[element] || `Explore the ${name} element in astrology.`;

  return buildMetadata({
    title: `${name} Element — Traits, Signs & Meaning`,
    description: desc,
    path: `/learn/elements/${element}`,
    ogImage: buildOgImageUrl({
      title: `${name} Element`,
      subtitle: `${ELEMENT_NAMES[element === "fire" ? "fire" : element] === name ? "" : ""}${name === "Fire" ? "Aries · Leo · Sagittarius" : name === "Earth" ? "Taurus · Virgo · Capricorn" : name === "Air" ? "Gemini · Libra · Aquarius" : "Cancer · Scorpio · Pisces"}`,
      type: "element",
      typeId: element,
    }),
  });
}

export default function ElementDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}