/**
 * convex/horoscopes/prompt.ts — v2.0 — Horoscope generation prompt template.
 *
 * v2.0 CHANGES from v1.0:
 *  - Zero astrology jargon in output. All planetary/aspect data is translated
 *    into felt human experience before reaching the reader.
 *  - Addictive, varied hook per sign — 12 distinct psychological angle types
 *    ensure no two signs share the same hook style on any given day.
 *  - 450 character hard limit on hook + bodyText combined.
 *  - Mantra replaces the static motto on the sign page (first-person, punchy).
 *  - Daily pillars replace cosmicDetails — 4 short, engaging, sign-specific
 *    items that fill the specs grid on the sign page.
 *  - Tone: direct, psychological, relatable. "90% resonance" target.
 */

import { getSignTrait } from "../lib/astrology/signTraits";
import { getMoonPhaseFrame } from "../lib/astronomyEngine";

// ─── Version ────────────────────────────────────────────────────────────────

export const VERSION = "v2.0";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DailyAstrologyContext = {
    /** "YYYY-MM-DD" */
    date: string;
    /** Planet placements with retrograde flags */
    planetPositions: {
        planet: string;
        sign: string;
        degreeInSign: number;
        isRetrograde: boolean;
    }[];
    moonPhase: {
        name: string;
        illumination: number;
        emoji: string;
    };
    activeAspects: {
        planetA: string;
        planetB: string;
        aspectType: string;
        orb: number;
        influence: string;
    }[];
    retrogradeContext: {
        current: string[];
        upcoming: string[];
        recentDirect: string[];
    };
    retrogradePlanets?: Array<{
        planet: string;
        status: "active" | "upcoming" | "recently_direct" | "clear";
        startDate: string;
        endDate: string;
        totalDays: number;
        daysElapsed: number;
        daysRemaining: number;
        progressPercent: number;
        phase: "entering" | "deepening" | "peak" | "exiting" | "approaching" | "aftermath" | "clear";
    }>;
    dominantThemes: string[];
    energySignature: string;
    /** Optional — populated when moon is void-of-course */
    voidOfCourseMoon?: {
        isVoid: boolean;
        inSign?: string;
        untilSign?: string;
    };
    /** Optional — next moon sign change */
    moonNextIngress?: {
        timestamp: string;
        fromSign: string;
        toSign: string;
    };
    /** Optional — element with most planets today */
    dominantElement?: string;
    /** Optional — sign with 3+ planets */
    stelliumSign?: string;
    /** Optional — aspect pattern descriptors */
    aspectSummary?: string[];
    /** Optional — felt language from cosmic weather */
    feltLanguage?: string;
};

export type PromptSections = {
    system: string;
    user: string;
};

// ─── Per-Sign Hook Angles ───────────────────────────────────────────────────
//
// Each sign gets a distinct PSYCHOLOGICAL ANGLE for its daily hook.
// This ensures the 12 signs never share the same opening style.
// The LLM must write a hook that matches its sign's angle type,
// translating that day's astrology into a statement that fits.

type HookAngle = {
    /** Short label for the hook type */
    angle: string;
    /** Description of what this hook should feel like */
    description: string;
    /** Example hooks that match this angle — varied daily, never reuse verbatim */
    examples: string[];
};

const HOOK_ANGLES: Record<string, HookAngle> = {
    Aries: {
        angle: "confrontation_and_courage",
        description:
            "Open with a truth they've been avoiding or a brave move that's overdue. The hook should feel like a challenge issued by someone who believes in them.",
        examples: [
            "The thing you're not saying is the thing that needs saying.",
            "You've been waiting for permission you already have.",
            "The friction you're feeling isn't resistance — it's the starting line.",
        ],
    },
    Taurus: {
        angle: "comfort_zone_disruption",
        description:
            "Open with a challenge to what they've been settling for. The hook should make them reconsider what 'comfortable' is actually costing them.",
        examples: [
            "What you've been tolerating has been costing you more than you think.",
            "The comfort you're protecting is the thing that's keeping you small.",
            "Stability and stagnation are two different things — and you know which one this is.",
        ],
    },
    Gemini: {
        angle: "information_and_perspective",
        description:
            "Open with a shift in understanding, something they're about to realize, or a conversation that changes everything. The hook should feel like a secret being told.",
        examples: [
            "Someone is about to say something that rearranges everything you thought you knew.",
            "The answer you've been looking for is in a conversation you've been avoiding.",
            "What you learn today won't fit neatly into what you already believe.",
        ],
    },
    Cancer: {
        angle: "emotional_stakes_and_protection",
        description:
            "Open with what they're really feeling beneath the surface — something they're protecting that actually needs to breathe. The hook should feel like being truly seen.",
        examples: [
            "What you're really afraid of isn't what you think.",
            "The wall you built to keep people out is also keeping something in.",
            "You've been carrying someone else's feeling and calling it your own.",
        ],
    },
    Leo: {
        angle: "recognition_and_expression",
        description:
            "Open with what happens when they stop performing and start being real. The hook should feel like being seen without trying.",
        examples: [
            "They see more than you realize — and they like what they see.",
            "The version of you that doesn't try is the version that wins.",
            "You don't need to make an entrance — you are the entrance.",
        ],
    },
    Virgo: {
        angle: "precision_and_letting_go",
        description:
            "Open with the one detail that actually matters versus the ten they're fixating on. The hook should feel like someone cutting through the noise with kindness.",
        examples: [
            "The detail you're obsessing over is the wrong one.",
            "You've already solved this — you just haven't accepted the answer.",
            "Perfection isn't the finish line. It's the thing keeping you from starting.",
        ],
    },
    Libra: {
        angle: "decision_and_balance",
        description:
            "Open with a decision they've been circling but not making. The hook should feel like gentle but firm push toward choosing.",
        examples: [
            "The choice you keep putting off has already been made — you just haven't admitted it.",
            "Both options are real. Only one feels like yours.",
            "You've been weighing so long the scale is broken. Go with the one that scares you a little.",
        ],
    },
    Scorpio: {
        angle: "revelation_and_truth",
        description:
            "Open with something they already sense but haven't named out loud. The hook should feel like a truth surfacing from deep water.",
        examples: [
            "Something you've been sensing is about to be confirmed.",
            "You already know. You've known since the beginning.",
            "The thing no one is talking about is the only thing that matters.",
        ],
    },
    Sagittarius: {
        angle: "expansion_and_horizon",
        description:
            "Open with an unexpected opening or why the familiar route isn't the right one. The hook should feel like a door appearing where there was only wall.",
        examples: [
            "The door you're staring at isn't the one that opens.",
            "What looks like a detour is actually the shortcut.",
            "You're about to outgrow a version of your life you thought was permanent.",
        ],
    },
    Capricorn: {
        angle: "structure_and_redefinition",
        description:
            "Open with a redefinition of success or why 'ready' is a moving target. The hook should feel like permission to change the rules.",
        examples: [
            "Your definition of 'ready' is just fear wearing a tie.",
            "The mountain hasn't changed. You have.",
            "You've been measuring yourself against a finish line you already crossed.",
        ],
    },
    Aquarius: {
        angle: "pattern_disruption_and_truth",
        description:
            "Open with seeing what others don't, or questioning the default. The hook should feel like noticing the thing everyone's pretending not to see.",
        examples: [
            "What everyone calls normal is about to look very strange.",
            "You're not imagining it — the pattern is real.",
            "The most obvious answer is the one nobody's considering. Except you.",
        ],
    },
    Pisces: {
        angle: "boundary_and_truth",
        description:
            "Open with feeling something that isn't entirely theirs to carry, or trusting what they know but can't explain. The hook should feel like clarity arriving through fog.",
        examples: [
            "What you're feeling isn't all yours — and that's the most important thing to know today.",
            "You've been tuning into a frequency no one else can hear. Trust it.",
            "The thing that makes no logical sense is the thing that's true.",
        ],
    },
};

// ─── Constants ─────────────────────────────────────────────────────────────

const CANONICAL_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// ─── Section A — Astronomical Context ─────────────────────────────────────

/**
 * Format planet positions into a CONTEXT-ONLY block.
 * This data is fed to the LLM for grounding — it must NOT appear
 * verbatim in the output. The LLM must translate all of this
 * into felt human experience.
 */
function formatPlanetPositions(ctx: DailyAstrologyContext): string {
    if (!ctx.planetPositions.length) return "No planet data available.";

    const lines = ctx.planetPositions.map((p) => {
        const retroFlag = p.isRetrograde
            ? " [RETROGRADE — energy turns inward, review not advance]"
            : "";
        return `  ${p.planet} in ${p.sign} at ${p.degreeInSign.toFixed(1)}°${retroFlag}`;
    });

    return lines.join("\n");
}

/**
 * Format active aspects — for LLM context only, never for output.
 */
function formatActiveAspects(ctx: DailyAstrologyContext): string {
    if (!ctx.activeAspects.length) return "  No exact aspects today.";

    return ctx.activeAspects
        .map((a) => {
            const tightFlag = a.orb < 3 ? " [TIGHT ORB — especially influential]" : "";
            const influenceTag = a.influence ? ` (${a.influence})` : "";
            return `  ${a.planetA} ${a.aspectType} ${a.planetB} — orb ${a.orb.toFixed(1)}°${influenceTag}${tightFlag}`;
        })
        .join("\n");
}

/**
 * Format retrograde context — for LLM context only.
 * Now includes rich per-planet detail so the AI knows WHERE in the
 * retrograde cycle each planet is (entering / deepening / peak / exiting).
 */
function formatRetrogradeContext(ctx: DailyAstrologyContext): string {
    const { current, upcoming, recentDirect } = ctx.retrogradeContext;
    const parts: string[] = [];
    if (current.length) parts.push(`  Currently retrograde: ${current.join(", ")}`);
    if (upcoming.length) parts.push(`  Turning retrograde soon: ${upcoming.join(", ")}`);
    if (recentDirect.length) parts.push(`  Recently turned direct: ${recentDirect.join(", ")}`);

    // Rich per-planet detail with progress position
    if (ctx.retrogradePlanets && ctx.retrogradePlanets.length > 0) {
        parts.push("");
        parts.push("  RETROGRADE CYCLE POSITIONS (translate into felt experience):" );
        for (const rp of ctx.retrogradePlanets) {
            if (rp.status === "active") {
                parts.push(`    ${rp.planet}: ${rp.phase} phase — ${rp.progressPercent}% through retrograde (${rp.daysElapsed}d elapsed, ${rp.daysRemaining}d remaining of ${rp.totalDays}d window)`);
            } else if (rp.status === "upcoming") {
                parts.push(`    ${rp.planet}: ${rp.phase} — turns retrograde in ${rp.daysRemaining}d`);
            } else if (rp.status === "recently_direct") {
                parts.push(`    ${rp.planet}: ${rp.phase} — turned direct ${rp.daysRemaining}d ago (shadow period may linger)`);
            }
            // "clear" planets are omitted — no retrograde story to tell
        }
    }

    return parts.length ? parts.join("\n") : "  No retrograde activity.";
}

/**
 * Build Section A — astronomical context.
 * This is CONTEXT for the LLM only. It must never appear in the output.
 */
function buildSectionA(ctx: DailyAstrologyContext): string {
    const planets   = formatPlanetPositions(ctx);
    const aspects  = formatActiveAspects(ctx);
    const retro    = formatRetrogradeContext(ctx);
    const { moonPhase, voidOfCourseMoon, moonNextIngress } = ctx;

    const voidLine = voidOfCourseMoon?.isVoid
        ? `  Moon void-of-course in ${voidOfCourseMoon.inSign ?? "unknown"} — decisions may not stick.`
        : "";

    const ingressLine = moonNextIngress
        ? `  Moon shifts ${moonNextIngress.fromSign} → ${moonNextIngress.toSign}`
        : "";

    const themes = ctx.dominantThemes.length
        ? `  Themes: ${ctx.dominantThemes.join(", ")}`
        : "";
    const element = ctx.dominantElement
        ? `  Dominant element: ${ctx.dominantElement}`
        : "";
    const stellium = ctx.stelliumSign
        ? `  Stellium in ${ctx.stelliumSign} (3+ planets concentrated)`
        : "";
    const aspectSum = ctx.aspectSummary?.length
        ? `  Aspect patterns: ${ctx.aspectSummary.join(", ")}`
        : "";

    const moonPhaseFrame = getMoonPhaseFrame(moonPhase.name);
    const feltLanguageBlock = ctx.feltLanguage
        ? `COLLECTIVE ENERGY
  ${ctx.feltLanguage}`
        : "";

    return `SECTION A — ASTRONOMICAL CONTEXT for ${ctx.date}
═══════════════════════════════════════════════════════
⚠️  This entire section is CONTEXT ONLY. Do NOT repeat any planet names,
aspect names, astrological terms, or jargon in your output.
Translate EVERYTHING into felt human experience.

MOON
  Phase: ${moonPhase.name} ${moonPhase.emoji} (${moonPhase.illumination}% illuminated)
${voidLine}${ingressLine}

MOON PHASE FRAME
${moonPhaseFrame}
${feltLanguageBlock}

PLANET POSITIONS
${planets}

ACTIVE ASPECTS
${aspects}

RETROGRADE CONTEXT
${retro}

DOMINANT THEMES
${themes}
${element}
${stellium}
${aspectSum}

ENERGY SIGNATURE: ${ctx.energySignature}`;
}

// ─── Section B — Sign-Specific Framing + Hook Angle ────────────────────────

function buildSectionB(sign: string, _ctx: DailyAstrologyContext): string {
    if (!CANONICAL_SIGNS.includes(sign as any)) {
        throw new Error(`Invalid sign: "${sign}". Must be one of: ${CANONICAL_SIGNS.join(", ")}`);
    }

    const traitBlurb = getSignTrait(sign);
    const hookAngle = HOOK_ANGLES[sign];
    if (!hookAngle) {
        throw new Error(`No hook angle defined for sign: ${sign}`);
    }

    const exampleList = hookAngle.examples.map((e) => `    "${e}"`).join("\n");

    return `SECTION B — SIGN FRAMING: ${sign.toUpperCase()}
═══════════════════════════════════════════════════════

WHO YOU'RE WRITING FOR
${traitBlurb}

YOUR HOOK ANGLE: ${hookAngle.angle}
${hookAngle.description}

Example hooks (vary daily — never reuse verbatim):
${exampleList}

⚠️  The hook MUST use this angle type. Do NOT give a ${sign} a hook that
belongs to another sign's angle. Every sign gets its own distinct flavor.`;
}

// ─── Section C — Output Schema + Generation Rules ──────────────────────────

function buildSectionC(): string {
    return `SECTION C — OUTPUT SCHEMA
═══════════════════════════════════════════════════════

Respond with ONLY valid JSON. No markdown fences. No commentary. No extra fields.

{
  "hook": "string — 15-60 chars. The addictive opening line. A psychological or behavioral
           truth that makes someone stop scrolling and feel seen. Must match your assigned
           hook angle from Section B. Rational and grounded — NOT mystical or vague.",

  "bodyText": "string — 2-3 sentences that continue from the hook. Plain, direct, human language.
               Translate the day's astrology into specific, relatable experience. No jargon.
               No hedging. Write like a friend who sees right through you.
               100-390 characters.",

  "mantra": "string — ≤12 words, first person ('I trust...', 'I release...', 'I choose...').
             Something you'd write on a bathroom mirror. Not generic — make it specific to this sign today.",

  "dailyPillars": {
    "vibe":       "string — 2-3 words. Today's overall energy feel. e.g. 'quiet momentum',
                   'electric clarity', 'slow burn', 'open horizon'",
    "powerMove":  "string — 2-5 words. The single most impactful action to take today.
                   e.g. 'Send that message', 'Hold the line', 'Say yes out loud'",
    "blindSpot":  "string — 2-6 words. What they're likely overlooking today.
                   e.g. 'Your own limits', 'A quiet offer', 'The obvious next step'",
    "luckySpark": "string — 2-5 words. A small thing with outsized potential today.
                   e.g. 'That random idea', 'A side conversation', 'Morning pages'"
  },

  "domainScores": [
    { "name": "Love",      "score": 78 },
    { "name": "Career",    "score": 62 },
    { "name": "Family",     "score": 55 },
    { "name": "Health",    "score": 45 },
    { "name": "Finance",    "score": 71 },
    { "name": "Creativity", "score": 83 }
  ]
}

CHARACTER LIMITS:
  - hook + bodyText combined MUST NOT exceed 450 characters. Count carefully.
  - mantra MUST NOT exceed 12 words.
  - Each dailyPillars value MUST be its specified word range.
  - domainScores MUST have exactly 6 entries. Scores MUST be 0-100 integers.
  - The 6 entries must be chosen from these 8 domains: Love, Career, Family, Health, Finance, Creativity, Social, Spirituality.
  - Pick the 6 domains most affected by today's transits for this sign, so the omitted 2 vary by sign and day.
  - Vary scores realistically: not all high, not all low. At least one domain notably different.

JARGON BLACKLIST — NEVER include in your output:
  Planet names (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
  Aspect names (square, trine, conjunction, opposition, sextile)
  House numbers or references
  Retrograde, ingress, stellium, orb, transit, natal, chart
  Elements (fire, earth, air, water) used as astrology terms
  Any phrase like "the stars align", "cosmic energy", "the universe wants"
  Any phrase like "Mercury in Gemini" or "Venus square Mars"

INSTEAD, translate into lived experience:
  "Mercury retrograde" → "conversations and plans may need revisiting"
  "Venus trine Jupiter" → "relationships carry unexpected warmth today"
  "Mars square Pluto" → "there's a pressure building — handle it deliberately"
  "Full Moon" → "things that have been building are ready to surface"
  "Moon void-of-course" → "decisions made right now may not stick"

TONE RULES:
  1. Write like a psychologically literate friend — direct, warm, specific.
  2. Be PRECISE. Not "something may shift" but "the conversation you've been avoiding needs to happen."
  3. The reader should feel: "Wait, how does this know that about me?"
  4. Vary sentence structure. Never start more than one sentence the same way.
  5. The hook must be immediately rational — no mysticism required to understand it.
  6. Each dailyPillars value should feel specific to this sign on this day,
     not generic advice that works for anyone.`;
}

// ─── System Persona ─────────────────────────────────────────────────────────

const SYSTEM_PERSONA = `You are a horoscope writer for a mainstream digital publication read by millions.
Your #1 priority is making readers feel seen — like the horoscope was written specifically for them.

APPROACH:
  - You read the astronomical context like a weather report, but you WRITE like
    a great friend who happens to understand the sky.
  - Every planetary position is a HUMAN EXPERIENCE in disguise. Your job is to
    translate the astronomy into psychology, behavior, and feeling.
  - Never let a planet name, aspect type, or astrological term appear in your output.
  - The hook must be immediately gripping and rational. Like a quote that could be famous.
  - Different signs get different psychological angles — follow your assigned angle exactly.

Your writing is:
  — Warm but not soft. Direct but not harsh.
  — Specific, never vague. If you catch yourself writing "something may," stop and write what.
  — Psychologically grounded. You write about real human behavior, not mystical abstractions.
  — The kind of voice that makes someone screenshot the horoscope and send it to a friend.`;
const SYSTEM_PERSONA_V2 = `[${VERSION}] ` + SYSTEM_PERSONA;

// ─── Main Builder ────────────────────────────────────────────────────────────

export type BuildPromptOptions = {
    sign: string;
    context: DailyAstrologyContext;
};

/**
 * buildHoroscopePrompt — builds the system + user prompt sections for a
 * horoscope generation call.
 *
 * v2.0: Per-sign hook angles, zero jargon output, 450-char limit,
 *       mantra for sign-page motto, dailyPillars for specs grid.
 */
export function buildHoroscopePrompt(options: BuildPromptOptions): PromptSections {
    const { sign, context } = options;

    const sectionA = buildSectionA(context);
    const sectionB = buildSectionB(sign, context);
    const sectionC = buildSectionC();

    const userContent = [
        `Generate today's horoscope for ${sign} on ${context.date}.`,
        sectionA,
        sectionB,
        sectionC,
    ].join("\n\n");

    return {
        system: SYSTEM_PERSONA_V2,
        user: userContent,
    };
}