import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AuthClientLayout from "./_auth-client-layout";

export const metadata: Metadata = buildMetadata({
  title: "Sign In | Stars Guide",
  description: "Sign in to your stars.guide account to access your birth chart, daily horoscopes, and AI Oracle.",
  path: "/sign-in",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthClientLayout>{children}</AuthClientLayout>;
}
