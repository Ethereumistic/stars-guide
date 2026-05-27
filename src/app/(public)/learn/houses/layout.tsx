import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "The Twelve Houses",
  description:
    "Explore all 12 astrological houses — from the 1st House of Self to the 12th House of the Unconscious. Learn their meanings on stars.guide.",
  path: "/learn/houses",
});

export default function HousesLayout({ children }: { children: React.ReactNode }) {
  return children;
}