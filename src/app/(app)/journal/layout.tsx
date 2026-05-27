import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import JournalClientLayout from "./_journal-client-layout";

export const metadata: Metadata = buildMetadata({
  title: "Journal | Stars Guide",
  description:
    "Your personal astrological journal. Reflect, track patterns, and write your cosmic story on stars.guide.",
  path: "/journal",
  noIndex: true, // Auth-gated — no point indexing
});

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <JournalClientLayout>{children}</JournalClientLayout>;
}