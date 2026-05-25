import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign In | Stars Guide",
  description: "Sign in to your stars.guide account to access your birth chart, daily horoscopes, and AI Oracle.",
  path: "/sign-in",
  noIndex: true,
});

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}