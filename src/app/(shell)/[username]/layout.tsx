import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  return buildMetadata({
    title: `@${username} — Birth Chart & Profile | Stars Guide`,
    description: `View @${username}'s birth chart, planetary placements, and astrological profile on stars.guide.`,
    path: `/${username}`,
  });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}