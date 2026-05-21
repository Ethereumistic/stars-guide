/**
 * Daily Journaling Prompts — hardcoded bank organized by topic category.
 *
 * Extensible: replace getDailyPrompts() with an AI-generated variant
 * without changing the call site.
 */

export type PromptTopic =
  | "reflection"
  | "gratitude"
  | "emotions"
  | "relationships"
  | "growth"
  | "dreams"
  | "mindfulness";

export interface JournalPrompt {
  text: string;
  topic: PromptTopic;
  icon: string;
}

/** Color accent for each topic (used on card left-border) */
export const TOPIC_COLORS: Record<PromptTopic, string> = {
  reflection: "border-l-amber-400",
  gratitude: "border-l-green-400",
  emotions: "border-l-rose-400",
  relationships: "border-l-blue-400",
  growth: "border-l-violet-400",
  dreams: "border-l-indigo-400",
  mindfulness: "border-l-teal-400",
};

// ─── Prompt bank ───────────────────────────────────────────────────────────────

const PROMPTS: JournalPrompt[] = [
  // ── Reflection ──────────────────────────────────────────────────────────────
  {
    text: "What pattern has been repeating this week?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "If you could rewrite today, what would you change?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What surprised you today?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What lesson keep showing up in your life?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What would your younger self think of today?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What assumption did you challenge recently?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "When did you feel most like yourself today?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What conversation is still echoing in your mind?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What have you been putting off that keeps appearing?",
    topic: "reflection",
    icon: "🔄",
  },
  {
    text: "What does your gut say about the week ahead?",
    topic: "reflection",
    icon: "🔄",
  },

  // ── Gratitude ───────────────────────────────────────────────────────────────
  {
    text: "What small thing brought you joy today?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "Who made your day better?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What ability are you grateful for?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What comfort do you rarely think about but appreciate?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What challenge are you secretly grateful for?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What ordinary moment felt extraordinary?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What's something you used to want that you now have?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What food, smell, or sound reminded you of something good?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "What is one thing about your body you're grateful for?",
    topic: "gratitude",
    icon: "🌱",
  },
  {
    text: "Who is someone you rarely thank but should?",
    topic: "gratitude",
    icon: "🌱",
  },

  // ── Emotions ─────────────────────────────────────────────────────────────────
  {
    text: "What emotion dominated your day?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "When did you feel most alive today?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "What feeling are you sitting with right now?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "What emotion have you been avoiding?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "Where in your body do you feel tension right now?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "What made you smile when no one was watching?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "When today did you feel a wave of calm?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "What的情绪字在你想用中文表达?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "What fear is quietly influencing your choices?",
    topic: "emotions",
    icon: "🌊",
  },
  {
    text: "If your current mood had a color, what would it be?",
    topic: "emotions",
    icon: "🌊",
  },

  // ── Relationships ────────────────────────────────────────────────────────────
  {
    text: "Who's been on your mind lately?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "How did you connect with someone today?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What would you tell someone you haven't spoken to in a while?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What boundary do you need to set or reinforce?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "Who inspired you recently without knowing it?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What relationship feels out of balance right now?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "How did you show up for someone today?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What do you need to forgive someone for?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What conversation are you avoiding because it feels hard?",
    topic: "relationships",
    icon: "🤝",
  },
  {
    text: "What's one act of kindness you witnessed today?",
    topic: "relationships",
    icon: "🤝",
  },

  // ── Growth ──────────────────────────────────────────────────────────────────
  {
    text: "What did you learn about yourself today?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What challenged you?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "Where did you step outside your comfort zone?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What would you do differently if you knew no one was watching?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What skill did you practice today, even casually?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What mistake turned into a valuable insight?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What belief is starting to shift for you?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What's one small step you took toward a big goal?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "Where do you feel stuck, and what might unstick you?",
    topic: "growth",
    icon: "🌿",
  },
  {
    text: "What advice would your future self give you right now?",
    topic: "growth",
    icon: "🌿",
  },

  // ── Dreams ───────────────────────────────────────────────────────────────────
  {
    text: "What did you dream about last night?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What's a dream (aspiration) you haven't told anyone?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "If you could dream about anything tonight, what would it be?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What's a dream that keeps returning?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "If your life had a different career path, what would it be?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What does your ideal morning look like?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What place do you keep thinking about visiting?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "If you had no fear, what would you attempt?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What version of yourself are you growing into?",
    topic: "dreams",
    icon: "✨",
  },
  {
    text: "What's a creative project you've been putting on hold?",
    topic: "dreams",
    icon: "✨",
  },

  // ── Mindfulness ─────────────────────────────────────────────────────────────
  {
    text: "What are you noticing around you right now?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "Describe this moment in detail.",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "What does your body need right now?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "What sound can you hear that you usually tune out?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "Take three slow breaths. What changes?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "What are you grateful for in this exact moment?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "Where is your mind right now, and where do you want it to be?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "What does the air feel like on your skin?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "What time is it right now, and how does that land with you?",
    topic: "mindfulness",
    icon: "🪷",
  },
  {
    text: "Name five things you can see from where you're sitting.",
    topic: "mindfulness",
    icon: "🪷",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random seeded by a date string */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Day-fingerprint: a unique integer per calendar date */
function daySeed(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() >>> 0;
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Return 3 prompts for the given date, deterministically derived from the date.
 * Rotates through all 7 categories over the week.
 */
export function getDailyPrompts(date: Date): JournalPrompt[] {
  const rng = seededRandom(daySeed(date));

  // Divide the 7-day week into 3 roughly equal buckets of categories
  const dayOfWeek = new Date(date).getDay(); // 0=Sun … 6=Sat

  // Build a category order for today: rotate so each day starts somewhere different
  const allTopics: PromptTopic[] = [
    "reflection",
    "gratitude",
    "emotions",
    "relationships",
    "growth",
    "dreams",
    "mindfulness",
  ];

  // Rotate topics by day of week
  const rotated = [
    ...allTopics.slice(dayOfWeek % 7),
    ...allTopics.slice(0, dayOfWeek % 7),
  ];

  // Pick 3 topics: today, middle of week, end — using the rng
  const selectedTopics = [rotated[0], rotated[2], rotated[4]];

  return selectedTopics.map((topic) => {
    const candidates = PROMPTS.filter((p) => p.topic === topic);
    const idx = Math.floor(rng() * candidates.length);
    return candidates[idx];
  });
}