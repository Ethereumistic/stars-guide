import type { Metadata } from "next";
import { buildMetadata, capitalize, formatDateForTitle } from "@/lib/seo";
import { compositionalSigns } from "@/astrology/signs";

interface Props {
  params: Promise<{ sign: string; date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sign, date } = await params;
  const signName = capitalize(sign);
  const signData = compositionalSigns.find((s) => s.id === sign.toLowerCase());
  const formattedDate = formatDateForTitle(date);

  const description = signData
    ? `${signName} horoscope for ${formattedDate} — ${signData.traits}. Free daily astrological insights on stars.guide.`
    : `${signName} horoscope for ${formattedDate} on stars.guide.`;

  return buildMetadata({
    title: `${signName} Horoscope for ${formattedDate} | Stars Guide`,
    description,
    path: `/horoscopes/${sign}/${date}`,
  });
}

export default function HoroscopeDateLayout({ children }: { children: React.ReactNode }) {
  return children;
}