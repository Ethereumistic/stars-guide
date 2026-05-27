import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { websiteSchema, organizationSchema } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/seo/og";

export const metadata: Metadata = buildMetadata({
  title: "Navigate your fate",
  description:
    "Celestial horoscopes, birth chart analysis, and astrology guides. Discover your destiny with AI-powered cosmic insights on stars.guide.",
  path: "/",
  ogImage: buildOgImageUrl({
    title: "stars.guide",
    subtitle: "Navigate your fate",
  }),
});

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}