import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Planetary Bodies",
  description:
    "Explore the planets in astrology — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, and more. Learn their meanings and influence on stars.guide.",
  path: "/learn/planets",
});

export default function PlanetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}