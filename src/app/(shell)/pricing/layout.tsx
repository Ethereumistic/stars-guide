import type { Metadata } from "next";
import { staticMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata = staticMetadata(
  "Pricing — Choose Your Orbit",
  "Explore stars.guide pricing plans. Free horoscopes, Popular insights, and Premium cosmic guidance — find the tier that fits your journey.",
  "/pricing",
  {
    ogImage: buildOgImageUrl({
      title: "Choose Your Orbit",
      subtitle: "stars.guide Pricing",
    }),
  },
);

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}