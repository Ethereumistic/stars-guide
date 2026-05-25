import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Daily Horoscopes | Stars Guide",
  description:
    "Read your free daily horoscope for all 12 zodiac signs. AI-powered astrological insights updated every day on stars.guide.",
  path: "/horoscopes",
});

export default function HoroscopesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}