"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Loader2, Orbit } from "lucide-react";

type Answers = {
  reportFocus?: string[];
  tonePreference?: string;
};

type Choice = {
  value: string;
  label: string;
  note: string;
};

const FOCUS_CHOICES: Choice[] = [
  { value: "Self-trust", label: "The part of me I’m learning to trust", note: "Instinct, confidence, and your own timing" },
  { value: "Recurring patterns", label: "A pattern I keep meeting", note: "The loop beneath familiar reactions" },
  { value: "Love & attachment", label: "Love, closeness, and what I need", note: "How you connect without losing yourself" },
  { value: "Purpose & work", label: "Work that feels like mine", note: "Direction, contribution, and natural strengths" },
  { value: "Current transition", label: "The season I’m stepping into", note: "What may be ready to change or deepen" },
  { value: "Whole chart", label: "Surprise me with what stands out", note: "Let the strongest chart pattern lead" },
];

const TONE_CHOICES: Choice[] = [
  { value: "Gentle and honest", label: "Gently, but honestly", note: "Warm language without avoiding the truth" },
  { value: "Clear and direct", label: "Clear and direct", note: "Name the pattern and get to the point" },
  { value: "Practical and grounded", label: "Practical and grounded", note: "Turn insight into something I can use" },
  { value: "Warm with wonder", label: "Warm, with a little wonder", note: "Keep the mystery without losing clarity" },
];

function ConstellationProgress({ step }: { step: 0 | 1 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 2`}>
      <span className="size-2 rounded-full bg-violet-200 shadow-[0_0_14px_rgba(221,214,254,.75)]" />
      <span className={`h-px w-9 transition-colors ${step === 1 ? "bg-violet-200/70" : "bg-white/15"}`} />
      <span className={`size-2 rounded-full transition-all ${step === 1 ? "bg-teal-200 shadow-[0_0_14px_rgba(153,246,228,.7)]" : "border border-white/25 bg-transparent"}`} />
    </div>
  );
}

export function BirthReportQuestionnaire({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (answers: Answers) => Promise<void> | void;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = React.useState<0 | 1>(0);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (nextAnswers: Answers) => {
    if (disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(nextAnswers);
    } finally {
      setSubmitting(false);
    }
  };

  const chooseFocus = (value: string) => {
    if (disabled || submitting) return;
    setAnswers({ reportFocus: [value] });
    setStep(1);
  };

  const chooseTone = (value: string) => {
    const nextAnswers = { ...answers, tonePreference: value };
    setAnswers(nextAnswers);
    void submit(nextAnswers);
  };

  const choices = step === 0 ? FOCUS_CHOICES : TONE_CHOICES;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-[1.75rem] border border-violet-200/15 bg-[#090a12]/95 shadow-[0_24px_80px_rgba(0,0,0,.38)] backdrop-blur-2xl"
      aria-labelledby="birth-report-question"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,.16),transparent_36%),radial-gradient(circle_at_95%_100%,rgba(94,234,212,.08),transparent_35%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full border border-white/[0.035]" />

      <div className="relative p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-violet-200/55">
            <Orbit className="size-3.5" /> Shape the reading
          </div>
          <ConstellationProgress step={step} />
        </div>

        <div className="mt-7 min-h-[5.75rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <p className="text-xs text-white/35">Two small choices. Nothing personal to explain.</p>
              <h3 id="birth-report-question" className="mt-2 max-w-xl font-serif text-2xl leading-tight text-white sm:text-3xl">
                {step === 0 ? "Where should your chart meet you first?" : "How should it speak to you?"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/48">
                {step === 0
                  ? "Choose one doorway. It changes the emphasis—not the astrology."
                  : "The same chart, in the voice that will land best today. Choose one to begin."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`choices-${step}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24 }}
            className="mt-5 grid gap-2 sm:grid-cols-2"
          >
            {choices.map((choice) => {
              const selected = step === 0
                ? answers.reportFocus?.includes(choice.value)
                : answers.tonePreference === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled || submitting}
                  onClick={() => step === 0 ? chooseFocus(choice.value) : chooseTone(choice.value)}
                  className={`group rounded-2xl border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-violet-200/30 bg-violet-200/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:border-violet-200/25 hover:bg-violet-200/[0.06]"}`}
                >
                  <span className="flex items-center justify-between gap-3 text-sm leading-5 text-white/78 transition group-hover:text-white">
                    {choice.label}
                    {submitting && selected && <Loader2 className="size-3.5 shrink-0 animate-spin text-violet-200" />}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-white/33">{choice.note}</span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
          {step === 1 ? (
            <button type="button" disabled={submitting} onClick={() => setStep(0)} className="inline-flex items-center gap-2 text-xs text-white/40 transition hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60">
              <ArrowLeft className="size-3.5" /> Change focus
            </button>
          ) : <span />}
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={() => void submit(step === 0 ? {} : answers)}
            className="inline-flex items-center gap-2 text-xs text-white/40 transition hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 disabled:opacity-45"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {submitting ? "Shaping your report…" : step === 0 ? "Use only my chart" : "Skip the tone choice"}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
