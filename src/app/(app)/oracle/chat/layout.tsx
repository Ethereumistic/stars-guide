import type { Metadata } from "next";
import { buildMetadata, faqSchema } from "@/lib/seo";

const ORACLE_FAQS = [
  {
    question: "What is the Stars Guide Oracle?",
    answer:
      "The Oracle is an AI-powered astrology advisor that uses your unique birth chart to deliver personalized insights about transits, compatibility, career timing, and more.",
  },
  {
    question: "How accurate is the Oracle?",
    answer:
      "The Oracle combines real astronomical data from astronomy-engine with advanced AI models. Insights are for entertainment and self-reflection — not a substitute for professional advice.",
  },
  {
    question: "Is the Oracle free?",
    answer:
      "Yes, every user gets free Oracle sessions with a daily quota. Upgrade to Popular or Premium for more sessions, deeper context, and priority responses.",
  },
  {
    question: "Does the Oracle use my real birth chart?",
    answer:
      "Yes — the Oracle pulls your Sun, Moon, Rising, and all planetary placements to generate chart-aware, personalized responses.",
  },
];

interface Props {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  ...buildMetadata({
    title: "AI Astrology Oracle — Ask the Stars | Stars Guide",
    description:
      "Ask the AI Astrology Oracle anything about your birth chart, transits, compatibility, and cosmic weather. Get personalized astrological insights on stars.guide.",
    path: "/oracle/chat",
  }),
  other: {
    "script:ld+json": JSON.stringify(faqSchema(ORACLE_FAQS)),
  },
};

export default function OracleChatLayout({ children }: Props) {
  return <>{children}</>;
}