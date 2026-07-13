"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Check, Loader2, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "What is taking up space in your mind?",
  "What felt meaningful today?",
  "What do you want to remember?",
];

const FEELINGS = [
  { label: "Heavy", value: { valence: -0.65, arousal: -0.1 } },
  { label: "Steady", value: { valence: 0.15, arousal: 0 } },
  { label: "Bright", value: { valence: 0.7, arousal: 0.35 } },
] as const;

interface SimpleJournalComposerProps {
  initialContent?: string;
  autoFocus?: boolean;
  onSaved?: (entryId: string) => void;
  className?: string;
}

export function SimpleJournalComposer({ initialContent = "", autoFocus, onSaved, className }: SimpleJournalComposerProps) {
  const createEntry = useMutation(api.journal.entries.createEntry);
  const [content, setContent] = React.useState(initialContent);
  const [feeling, setFeeling] = React.useState<(typeof FEELINGS)[number] | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setContent(initialContent), [initialContent]);

  async function save() {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const entryId = await createEntry({
        content: content.trim(),
        entryType: "freeform",
        mood: feeling?.value,
      });
      setSaved(true);
      setContent("");
      setFeeling(null);
      window.setTimeout(() => setSaved(false), 2200);
      onSaved?.(entryId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your entry could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={cn("overflow-hidden rounded-[28px] border border-white/10 bg-[#101426]/90 shadow-[0_30px_100px_rgba(0,0,0,0.32)]", className)}>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2 text-sm text-white/65"><PenLine className="h-4 w-4 text-[#b6a7ff]" /> New reflection</div>
        <span className="text-xs text-white/25">Private to you</span>
      </div>

      <div className="bg-[#f2efe8] p-5 text-[#252238] sm:p-8">
        <textarea
          autoFocus={autoFocus}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void save();
          }}
          placeholder="Write what’s on your mind…"
          className="min-h-52 w-full resize-none bg-transparent font-serif text-lg leading-8 outline-none placeholder:text-[#514c65]/40 sm:min-h-64 sm:text-xl"
        />
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7">
        {!content && (
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setContent(`${prompt}\n\n`)} className="rounded-full border border-white/10 px-3 py-2 text-left text-xs text-white/45 transition hover:border-[#9e8df2]/45 hover:text-white/75">
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-white/35">I feel</span>
            {FEELINGS.map((item) => (
              <button key={item.label} type="button" onClick={() => setFeeling(feeling?.label === item.label ? null : item)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", feeling?.label === item.label ? "border-[#aa98ff]/50 bg-[#aa98ff]/15 text-[#d3caff]" : "border-white/10 text-white/40 hover:text-white/70")}>{item.label}</button>
            ))}
          </div>
          <button type="button" onClick={() => void save()} disabled={!content.trim() || isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#b8a2ff] px-6 text-sm font-semibold text-[#171326] transition hover:bg-[#c7b5ff] disabled:cursor-not-allowed disabled:opacity-35">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {saved ? "Saved" : "Save reflection"}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </div>
    </section>
  );
}
