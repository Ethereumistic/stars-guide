import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Zodiac Signs | Stars Guide",
  description:
    "Explore all 12 zodiac signs — Aries through Pisces. Discover traits, dates, ruling planets, elements, and modalities on stars.guide.",
  path: "/learn/signs",
});

export default function SignsLayout({ children }: { children: React.ReactNode }) {
  return children;
}