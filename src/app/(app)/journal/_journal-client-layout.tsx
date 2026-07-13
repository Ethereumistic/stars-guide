"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useUserStore } from "@/store/use-user-store";

export default function JournalClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUserStore();

  React.useEffect(() => { if (user === null) router.push("/login"); }, [user, router]);
  if (user === null) return null;

  return (
    <div className="fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden bg-[#080a13] text-white">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#080a13]/85 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-white/40 transition hover:text-white/80"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Link>
        <Link href="/journal" className="flex items-center gap-2 font-serif text-sm text-white/85"><BookOpen className="h-4 w-4 text-[#aa99ef]" /> Journal</Link>
        <Link href="/oracle" className="text-sm text-white/40 transition hover:text-[#c7baff]">Ask Oracle</Link>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
