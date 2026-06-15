"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Answers = {
  currentSeason?: string[];
  reportFocus?: string[];
  growthPattern?: string[];
  tonePreference?: string;
  preferredName?: string;
  pronouns?: string;
  customContext?: string;
};

type Question = {
  id: keyof Answers;
  eyebrow: string;
  prompt: string;
  helper: string;
  multi?: boolean;
  options?: string[];
  placeholder?: string;
};

const QUESTIONS: Question[] = [
  {
    id: "currentSeason",
    eyebrow: "Chapter",
    prompt: "What season of life are you in right now?",
    helper: "Choose up to three. This helps the report emphasize the chart themes that matter now.",
    multi: true,
    options: ["Rebuilding", "Choosing direction", "Healing", "Expanding", "Ending something", "Beginning something", "Feeling between worlds"],
    placeholder: "Or name the season in your own words…",
  },
  {
    id: "reportFocus",
    eyebrow: "Focus",
    prompt: "What do you want this report to help you understand?",
    helper: "Choose up to three lenses for the interpretation.",
    multi: true,
    options: ["Love & attachment", "Purpose & work", "Self-trust", "Emotional patterns", "Confidence", "Current transition", "Hidden strengths"],
    placeholder: "Anything specific you want the chart to speak to?",
  },
  {
    id: "growthPattern",
    eyebrow: "Pattern",
    prompt: "Which inner pattern do you most want language for?",
    helper: "This keeps the shadow sections useful rather than vague.",
    multi: true,
    options: ["Overthinking", "People-pleasing", "Avoidance", "Restlessness", "Self-doubt", "Control", "Burnout", "Intensity"],
    placeholder: "Describe a pattern in your own words…",
  },
  {
    id: "tonePreference",
    eyebrow: "Compass",
    prompt: "When you read your chart, what kind of guidance feels most useful right now?",
    helper: "This helps me emphasize the parts of the chart that will be most actionable for this season.",
    options: ["Reassurance", "Clarity", "Grounding", "Momentum", "A loving reality check"],
  },
  {
    id: "preferredName",
    eyebrow: "Language",
    prompt: "What name should the report use?",
    helper: "Optional — leave blank if your username is fine.",
    placeholder: "Preferred name…",
  },
  {
    id: "pronouns",
    eyebrow: "Language",
    prompt: "Any pronouns or wording preferences?",
    helper: "Optional. The report mostly uses “you,” but this helps if third-person wording appears.",
    options: ["they/them", "she/her", "he/him", "Use my name", "No preference"],
    placeholder: "Custom wording preference…",
  },
  {
    id: "customContext",
    eyebrow: "Optional truth",
    prompt: "What do you already know is true about you?",
    helper: "One sentence is enough. The report can affirm, refine, or challenge it with chart evidence.",
    placeholder: "I already know that…",
  },
];

function toggleAnswer(current: string[] | undefined, value: string): string[] {
  const set = new Set(current ?? []);
  if (set.has(value)) set.delete(value);
  else if (set.size < 3) set.add(value);
  return Array.from(set);
}

export function BirthReportQuestionnaire({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (answers: Answers) => Promise<void> | void;
}) {
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [custom, setCustom] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const q = QUESTIONS[index];
  const isReview = index === QUESTIONS.length;

  const setText = (id: keyof Answers, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const appendCustom = () => {
    const text = (custom[q.id] ?? "").trim();
    if (!text) return;
    if (q.multi) setAnswers((prev) => ({ ...prev, [q.id]: toggleAnswer(prev[q.id] as string[] | undefined, text) }));
    else setText(q.id, text);
    setCustom((prev) => ({ ...prev, [q.id]: "" }));
  };

  const submit = async () => {
    setSubmitting(true);
    try { await onSubmit(answers); } finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative overflow-hidden rounded-[1.75rem] border border-galactic/20 bg-black/35 p-4 shadow-2xl backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,.16),transparent_38%),radial-gradient(circle_at_90%_20%,rgba(45,212,191,.08),transparent_32%)] pointer-events-none" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-galactic/70"><Sparkles className="h-3.5 w-3.5" /> Birth Chart Report</div>
          <div className="text-xs text-white/35">{isReview ? "Review" : `${index + 1}/${QUESTIONS.length}`}</div>
        </div>

        {isReview ? (
          <div className="space-y-3">
            <h3 className="font-serif text-xl text-white">Ready to craft your report?</h3>
            <p className="text-sm leading-6 text-white/55">You can go back and revise anything, or begin generation now.</p>
            <div className="grid gap-2 text-xs text-white/60">
              {Object.entries(answers).filter(([, v]) => Array.isArray(v) ? v.length : Boolean(v)).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><span className="text-white/35">{key}: </span>{Array.isArray(value) ? value.join(", ") : value}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-medium text-galactic/70">{q.eyebrow}</div>
              <h3 className="font-serif text-xl text-white">{q.prompt}</h3>
              <p className="mt-1 text-sm leading-6 text-white/50">{q.helper}</p>
            </div>
            {q.options && <div className="flex flex-wrap gap-2">{q.options.map((option) => {
              const value = answers[q.id];
              const selected = Array.isArray(value) ? value.includes(option) : value === option;
              return <button key={option} type="button" disabled={disabled || submitting} onClick={() => q.multi ? setAnswers((prev) => ({ ...prev, [q.id]: toggleAnswer(prev[q.id] as string[] | undefined, option) })) : setText(q.id, option)} className={selected ? "rounded-2xl border border-galactic/50 bg-galactic/15 px-3 py-2 text-sm text-white" : "rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65 hover:border-galactic/30 hover:text-white"}>{option}</button>;
            })}</div>}
            {q.placeholder && <div className="flex gap-2"><input value={custom[q.id] ?? (q.options ? "" : (answers[q.id] as string | undefined) ?? "")} onChange={(e) => q.options ? setCustom((prev) => ({ ...prev, [q.id]: e.target.value })) : setText(q.id, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.options) appendCustom(); }} placeholder={q.placeholder} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-galactic/35" />{q.options && <Button type="button" variant="outline" onClick={appendCustom} className="rounded-2xl border-white/10 bg-white/5">Add</Button>}</div>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" disabled={index === 0 || submitting} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="text-white/60 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <div className="flex gap-2">
            {!isReview && <Button type="button" variant="ghost" disabled={submitting} onClick={() => setIndex((i) => Math.min(QUESTIONS.length, i + 1))} className="text-white/45">Skip</Button>}
            {isReview ? <Button type="button" disabled={disabled || submitting} onClick={submit} className="rounded-2xl bg-galactic text-white hover:bg-galactic/80">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Begin report</Button> : <Button type="button" disabled={submitting} onClick={() => setIndex((i) => Math.min(QUESTIONS.length, i + 1))} className="rounded-2xl bg-white/10 text-white hover:bg-white/15">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
