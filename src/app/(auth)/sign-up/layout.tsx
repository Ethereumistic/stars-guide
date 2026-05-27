import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign Up | Stars Guide",
  description: "Create your stars.guide account. Get your free birth chart, daily horoscopes, and access to the AI Astrology Oracle.",
  path: "/sign-up",
  noIndex: true,
});

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}