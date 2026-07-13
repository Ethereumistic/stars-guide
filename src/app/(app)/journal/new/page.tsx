"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SimpleJournalComposer } from "@/components/journal/simple-journal-composer";

function NewEntry() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_50%_-10%,rgba(130,102,235,0.16),transparent_40%)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/journal" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/75"><ArrowLeft className="h-4 w-4" />Back to journal</Link>
        <h1 className="mb-2 font-serif text-4xl text-white">New reflection</h1>
        <p className="mb-8 text-sm text-white/40">No structure required. Just begin.</p>
        <SimpleJournalComposer initialContent={params.get("prompt") || ""} autoFocus onSaved={() => router.push("/journal")} />
      </div>
    </main>
  );
}

export default function NewJournalEntryPage() { return <Suspense><NewEntry /></Suspense>; }
