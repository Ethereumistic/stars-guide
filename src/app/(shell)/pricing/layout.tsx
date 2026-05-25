import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing | Stars Guide",
  description:
    "Choose your orbit — Free, Cosmic Flow, or Oracle. Explore stars.guide plans and start your celestial journey today.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}