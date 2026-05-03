"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { GiCursedStar, GiMazeCornea, GiScrollUnfurled } from "react-icons/gi";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────── */

interface DeepReadingsSlideProps {
  isActive?: boolean;
  wasActive?: boolean;
}

/* ── The Oracle's response text (streamed in chunks) ─────── */

const ORACLE_RESPONSE_LINES = [
  { type: "heading", text: "☉ Solar Identity — Sun in Pisces, House 7" },
  {
    type: "paragraph",
    text: "Your Sun in Pisces places your core identity in the realm of the dreamer. You perceive the world through an intuitive, almost psychic lens — absorbing the emotional currents around you like water through silk. In the 7th house, this seeks its mirror in others; your greatest self-discoveries come through intimate partnership.",
  },
  { type: "heading", text: "☽ Emotional Blueprint — Moon in Scorpio, House 3" },
  {
    type: "paragraph",
    text: "The Moon in Scorpio grants you an emotional depth that most never touch. You feel in extremes — love, loss, longing — and your inner world is a labyrinth. In the 3rd house, this manifests as a probing, investigative mind that reads between the lines of every conversation.",
  },
  {
    type: "heading",
    text: "↑ The Ascendant — Scorpio Rising",
  },
  {
    type: "paragraph",
    text: "With Scorpio rising, your outward presence carries an unmistakable intensity. Others sense there is more to you than meets the eye. Your chart ruler, Pluto, sits in Sagittarius — you transform yourself through the pursuit of truth and meaning across philosophical boundaries.",
  },
];

/* ── Markdown-ish renderer for the oracle response ────────── */

function OracleLine({
  line,
  delay,
}: {
  line: (typeof ORACLE_RESPONSE_LINES)[0];
  delay: number;
}) {
  if (line.type === "heading") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.4 }}
        className="text-[13px] font-semibold text-white/90 mt-3 mb-1 border-b border-white/10 pb-1"
      >
        {line.text}
      </motion.p>
    );
  }
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="text-[12px] text-white/70 leading-relaxed mb-2"
    >
      {line.text}
    </motion.p>
  );
}

/* ── Main Slide Component ──────────────────────────────────── */

export function DeepReadingsSlide({ isActive }: DeepReadingsSlideProps) {
  const [phase, setPhase] = React.useState<
    "idle" | "typing" | "sent" | "thinking" | "streaming" | "done"
  >("idle");
  const [typedText, setTypedText] = React.useState("");
  const [visibleLines, setVisibleLines] = React.useState<number>(0);
  const phaseRef = React.useRef(phase);
  phaseRef.current = phase;

  const USER_MESSAGE = "Analyze my birth chart in depth";

  /* Reset when becoming active */
  React.useEffect(() => {
    if (isActive) {
      setPhase("idle");
      setTypedText("");
      setVisibleLines(0);
      const t1 = setTimeout(() => setPhase("typing"), 800);
      return () => clearTimeout(t1);
    } else {
      setPhase("idle");
      setTypedText("");
      setVisibleLines(0);
    }
  }, [isActive]);

  /* Typewriter effect */
  React.useEffect(() => {
    if (phase !== "typing") return;
    if (typedText.length >= USER_MESSAGE.length) {
      const t = setTimeout(() => setPhase("sent"), 400);
      return () => clearTimeout(t);
    }
    const speed = 40 + Math.random() * 50;
    const t = setTimeout(() => {
      setTypedText(USER_MESSAGE.slice(0, typedText.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [phase, typedText]);

  /* Sent → thinking delay */
  React.useEffect(() => {
    if (phase !== "sent") return;
    const t = setTimeout(() => setPhase("thinking"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  /* Thinking → streaming */
  React.useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(() => {
      setPhase("streaming");
      setVisibleLines(1);
    }, 1800);
    return () => clearTimeout(t);
  }, [phase]);

  /* Progressive line reveal during streaming */
  React.useEffect(() => {
    if (phase !== "streaming") return;
    if (visibleLines >= ORACLE_RESPONSE_LINES.length) {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
    const delay = visibleLines === 1 ? 800 : 600 + Math.random() * 500;
    const t = setTimeout(() => {
      setVisibleLines((v) => v + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, visibleLines]);

  const showUserBubble =
    phase === "sent" ||
    phase === "thinking" ||
    phase === "streaming" ||
    phase === "done";
  const showThinking = phase === "thinking";
  const showStreaming = phase === "streaming" || phase === "done";
  const showCursor =
    phase === "streaming" && visibleLines < ORACLE_RESPONSE_LINES.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 h-full items-center px-6 md:px-12 max-w-[1600px] mx-auto py-8 lg:py-0">
      {/* ── Left Column: Title & Description (1 col) ── */}
      <motion.div
        className="space-y-6 col-span-1"
        initial={{ opacity: 0, x: -40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-4">
          <span className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-galactic/5 border-galactic/15 text-galactic">
            Oracle AI
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.1]">
            Deep Readings
          </h2>
          <p className="text-muted-foreground text-sm md:text-base uppercase tracking-widest font-medium max-w-md">
            AI-powered birth chart analysis
          </p>
        </div>

        <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-sm">
          Ask the Oracle to analyze your chart in depth. It reads your planetary
          placements, aspects, and houses — delivering a deeply personal reading
          that reveals the patterns written in your stars.
        </p>

        <div className="flex-col items-center space-y-4 pt-2">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
              <GiMazeCornea className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground/50 leading-snug">
              <p className="font-medium text-white">
                Powered by your <span className="font-serif">birth chart</span>
              </p>
              <p>Readings are personalized to your exact birth information</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
              <GiScrollUnfurled className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground/50 leading-snug">
              <p className="font-medium text-white">
                Connected to your <span className="font-serif">JOURNAL</span>
              </p>

              <p>
                Optionally Oracle can access your journal for deeper analysis
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Right Column: Chat Animation (2 cols) ── */}
      <motion.div
        className="col-span-2 flex items-center justify-center h-full"
        initial={{ opacity: 0, x: 40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <div className="w-full max-w-2xl h-[520px] flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden shadow-2xl shadow-black/20">
          {/* Chat header */}
          <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center">
                <GiCursedStar className="w-4 h-4 text-galactic" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-galactic rounded-full border-2 border-background" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Oracle</p>
              <p className="text-[10px] text-white/30">Deep reading session</p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
            {/* User message bubble */}
            <AnimatePresence>
              {showUserBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] bg-galactic/15 border border-galactic/20 rounded-2xl rounded-br-sm px-4 py-2.5">
                    <p className="text-[13px] text-white/90 leading-relaxed">
                      {showUserBubble ? USER_MESSAGE : typedText}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thinking dots */}
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-3"
                >
                  <div className="shrink-0 w-7 h-7 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center mt-0.5">
                    <GiCursedStar
                      className="w-3.5 h-3.5 text-galactic animate-spin"
                      style={{ animationDuration: "3s" }}
                    />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-galactic/50 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-galactic/50 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-galactic/50 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-[11px] text-white/30 italic">
                        Consulting the stars…
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Oracle response */}
            <AnimatePresence>
              {showStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex gap-3"
                >
                  <div className="shrink-0 w-7 h-7 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center mt-0.5">
                    <GiCursedStar
                      className={cn(
                        "w-3.5 h-3.5 text-galactic",
                        showCursor && "animate-spin",
                      )}
                      style={
                        showCursor ? { animationDuration: "3s" } : undefined
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
                      {ORACLE_RESPONSE_LINES.slice(0, visibleLines).map(
                        (line, i) => (
                          <OracleLine
                            key={i}
                            line={line}
                            delay={i === 0 ? 0 : 0.15}
                          />
                        ),
                      )}
                      {showCursor && (
                        <span className="inline-block w-1.5 h-3.5 bg-galactic/60 ml-0.5 animate-pulse rounded-sm" />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar (animated typewriter state) */}
          <div className="shrink-0 px-4 pb-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-galactic/15 via-primary/5 to-galactic/15 rounded-xl blur opacity-0 group-hover:opacity-60 transition duration-500" />
              <div className="relative flex items-center bg-background/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1 h-11 gap-1">
                <div className="flex-1 px-3 h-full flex items-center">
                  <AnimatePresence mode="wait">
                    {phase === "typing" ? (
                      <motion.p
                        key="typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[13px] text-white/90 leading-relaxed"
                      >
                        {typedText}
                        <span className="inline-block w-[2px] h-4 bg-galactic/70 ml-px animate-pulse rounded-sm align-middle" />
                      </motion.p>
                    ) : phase === "idle" ? (
                      <motion.p
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[13px] text-white/25"
                      >
                        Ask the stars anything...
                      </motion.p>
                    ) : (
                      <motion.p
                        key="disabled"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[13px] text-white/20 italic"
                      >
                        Oracle is speaking...
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Send button */}
                <motion.div
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                    phase === "typing" && typedText.length > 10
                      ? "bg-galactic text-white shadow-[0_0_12px_rgba(157,78,221,0.4)]"
                      : "bg-white/10 text-white/25",
                  )}
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
