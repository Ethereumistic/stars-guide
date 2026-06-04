/**
 * Oracle Output Safety Scanner — P0 MVP
 *
 * Scans LLM responses AFTER generation but BEFORE showing them to the user.
 * Three violation categories:
 *
 * 1. Medical advice — specific dosage recommendations, diagnoses, treatment plans
 * 2. Self-harm encouragement — content that could encourage or enable self-harm
 * 3. Journal content leakage — echoing back the user's private journal entries verbatim
 *
 * Also detects model REFUSALS on benign questions (P1 #14).
 * A refusal on an astrology question means the model overly-cautiously refused.
 * On detection, we retry on the next tier with a refusal-recovery block appended.
 *
 * Design: Regex-based MVP. No LLM calls — this runs synchronously after every
 * response and must be fast (<5ms). False positives are preferred over false negatives.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SafetyScanResult {
  /** Whether the response is safe to show the user */
  safe: boolean;
  /** Whether the response should be blocked (replaced with fallback) */
  blocked: boolean;
  /** Category flags that were triggered */
  flags: SafetyFlag[];
  /** Human-readable reason for the block (logged for admin review) */
  reason?: string;
}

export type SafetyFlag =
  | "medical_advice"
  | "self_harm_encouragement"
  | "journal_leak"
  | "identity_leak"
  | "refusal";

export interface RefusalCheckResult {
  /** Whether the response appears to be a model refusal */
  isRefusal: boolean;
  /** Confidence level: "high" = very likely a refusal, "medium" = probably a refusal */
  confidence: "high" | "medium";
  /** Which pattern matched */
  matchedPattern?: string;
}

// ─── Medical Advice Violation Patterns ───────────────────────────────────────
//
// These catch the model VIOLATING its safety rules by giving specific medical
// advice. General "talk to your doctor" language is NOT caught — that's desired.
//
// We're intentionally narrow: we catch explicit dosage/medication/treatment
// recommendations, not casual lifestyle advice like "meditation might help."

export const MEDICAL_ADVICE_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    // Specific dosage: "take 500mg of", "taking 500mg", "3 mg of", "2 capsules of"
    // Catches both base form (take) and gerund (taking, starting, using)
    pattern:
      /\b(tak(?:e|ing)|try(?:ing)?|start(?:ing)?|us(?:e|ing)|begin(?:ning)?|supplement(?:ing)?)\s+\d+\.?\d*\s*(mg|mcg|iu|ml|g\b|micrograms?|capsules?|pills?|tablets?)\b/i,
    description: "specific dosage recommendation",
  },
  {
    // "You should take/try/start [supplement/medication]"
    pattern:
      /\byou\s+should\s+(take|start|try|use|begin|supplement)\s+\w+/i,
    description: "direct medical recommendation",
  },
  {
    // Diagnosis: "You likely have X", "You probably have X condition"
    pattern:
      /\byou\s+(likely|probably|almost\s+certainly)\s+have\s+\w+/i,
    description: "diagnosis",
  },
  {
    // Treatment recommendation: "This can be treated with X"
    pattern:
      /\bcan\s+be\s+(treated|cured|managed|helped)\s+with\s+/i,
    description: "treatment recommendation",
  },
  {
    // "I recommend taking/using/supplementing with X"
    pattern:
      /\bi\s+recommend\s+(taking|using|supplementing|starting)\b/i,
    description: "explicit supplement recommendation",
  },
  {
    // "I suggest taking/starting X supplement/medication"
    pattern:
      /\bi\s+suggest\s+(taking|using|starting|trying)\b/i,
    description: "explicit supplement suggestion",
  },
];

// ─── Self-Harm Encouragement Patterns ────────────────────────────────────────
//
// These are EXTREMELY serious. Any match triggers an immediate block.
// The model should NEVER output self-harm encouragement, but we check anyway.

export const SELF_HARM_ENCOURAGEMENT_PATTERNS: { pattern: RegExp; description: string }[] =
  [
    {
      pattern:
        /\b(harm\s+yourself|cut\s+yourself|end\s+your\s+life|kill\s+yourself|hurt\s+yourself)\s+(is|would\s+be|could\s+be|might\s+be)\b/i,
      description: "self-harm encouragement",
    },
    {
      pattern:
        /\b(methods?\s+(to|for)\s+(self[-\s]?harm|suicide|ending\s+your\s+life))\b/i,
      description: "self-harm methods",
    },
    {
      pattern:
        /\b(how\s+to)\s+(kill\s+yourself|commit\s+suicide|end\s+your\s+life|self[-\s]?harm)\b/i,
      description: "self-harm how-to",
    },
  ];

// ─── Journal Content Leakage Patterns ────────────────────────────────────────
//
// These detect when the model echoes back private journal content verbatim.
// We compare against the journal context that was passed to the model.
// A substring match of >50 chars is considered a leak.

/** Minimum length of a journal fragment to count as a verbatim leak. */
const JOURNAL_LEAK_MIN_LENGTH = 50;

// ─── Identity Leak Patterns ─────────────────────────────────────────────────
//
// These detect when the model reveals its underlying model provider identity,
// which violates the Oracle's safety rules.

export const IDENTITY_LEAK_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern:
      /\bI\s+am\s+(an?\s+)?(Anthropic|OpenAI|Google|Gemini|GPT|Claude|Grok)\b/i,
    description: "model provider identity leak",
  },
  {
    pattern:
      /\bmade\s+by\s+(Anthropic|OpenAI|Google)\b/i,
    description: "model provider attribution leak",
  },
  {
    pattern:
      /\b(as\s+a)\s+(language\s+model|AI\s+model|large\s+language)\s+developed\s+by\b/i,
    description: "LLM self-description leak",
  },
];

// ─── Refusal Detection Patterns ──────────────────────────────────────────────
//
// These detect when a model refuses to answer a question. We differentiate
// between "high confidence" refusals (clear refusal language) and "medium
// confidence" (softer language that might just be hedging).

export const REFUSAL_PATTERNS_HIGH: { pattern: RegExp; description: string }[] = [
  {
    pattern: /\bi\s+can'?t\s+(help|assist|provide|answer|do\s+that|respond|comply|fulfill)\b/i,
    description: "explicit refusal",
  },
  {
    pattern: /\bi\s+cannot\s+(help|assist|provide|answer|respond|comply|fulfill)\b/i,
    description: "formal refusal",
  },
  {
    pattern: /\bi'?m\s+not\s+able\s+to\s+(help|assist|provide|answer)\b/i,
    description: "inability refusal",
  },
  {
    pattern: /\bi'?m\s+unable\s+to\s+(help|assist|provide|answer)\b/i,
    description: "inability refusal",
  },
  {
    pattern: /\bi\s+must\s+decline\b/i,
    description: "formal decline",
  },
  {
    pattern:
      /\bagainst\s+my\s+(guidelines|policy|policies|training|instructions|programming)\b/i,
    description: "policy-based refusal",
  },
  {
    pattern:
      /\bnot\s+(something|able|permitted|allowed)\s+i\s+can\b/i,
    description: "inability refusal",
  },
];

export const REFUSAL_PATTERNS_MEDIUM: { pattern: RegExp; description: string }[] = [
  {
    pattern: /\bas\s+an?\s+(ai|artificial|language\s+model)\b/i,
    description: "AI qualification",
  },
  {
    pattern: /\bi'?m\s+designed\s+to\b/i,
    description: "designed-to refusal",
  },
  {
    pattern: /\bnot\s+within\s+my\s+(scope|capabilities|expertise)\b/i,
    description: "scope refusal",
  },
];

// ─── Refusal Recovery Block ─────────────────────────────────────────────────
//
// Appended to the system prompt when retrying after a model refusal.
// This is a lightweight intervention — it tells the next model that the
// previous model refused incorrectly and asks it to answer normally.

export const REFUSAL_RECOVERY_BLOCK = `[REFUSAL RECOVERY]
The previous model refused this benign astrology question in error.
You are an astrology educator. The user is asking about symbolic
astrological concepts, not medical advice or harmful content.
Please answer their question normally, following your safety rules
while providing the astrological interpretation they seek.
[END REFUSAL RECOVERY]`;

// ─── Output Safety Block Message ─────────────────────────────────────────────
//
// This is the message shown to the user when a response is blocked
// by the output safety scanner. It replaces the LLM response entirely.

export const OUTPUT_SAFETY_BLOCK_MESSAGE =
  "The stars carried a message that needs recalibration. Please try again — your question is welcome here. ->";

// ─── Scanner Functions ──────────────────────────────────────────────────────

/**
 * Scan an LLM response for safety violations.
 *
 * Checks for:
 * 1. Medical advice violations (specific dosages, diagnoses, treatment recommendations)
 * 2. Self-harm encouragement (immediate block — most serious)
 * 3. Journal content leakage (verbatim echoes of private journal entries)
 * 4. Identity leaks (revealing underlying model provider)
 *
 * @param response     The LLM response text to scan.
 * @param journalContext Optional: the journal context that was injected into the prompt.
 *                       If provided, checks for verbatim leakage of journal content.
 * @returns SafetyScanResult indicating whether the response is safe to show.
 */
export function scanResponse(
  response: string,
  journalContext?: string | null,
): SafetyScanResult {
  const flags: SafetyFlag[] = [];
  const reasons: string[] = [];

  // ── 1. Self-harm encouragement (most serious — check first) ────────
  for (const { pattern, description } of SELF_HARM_ENCOURAGEMENT_PATTERNS) {
    if (pattern.test(response)) {
      flags.push("self_harm_encouragement");
      reasons.push(`Self-harm encouragement detected: ${description}`);
      break; // One match is enough
    }
  }

  // ── 2. Medical advice violations ────────────────────────────────────
  for (const { pattern, description } of MEDICAL_ADVICE_PATTERNS) {
    if (pattern.test(response)) {
      flags.push("medical_advice");
      reasons.push(`Medical advice violation: ${description}`);
      break; // One match is enough
    }
  }

  // ── 3. Journal content leakage ──────────────────────────────────────
  if (journalContext) {
    // Split journal context into lines, check for long verbatim matches
    const journalLines = journalContext
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > JOURNAL_LEAK_MIN_LENGTH);

    for (const line of journalLines) {
      if (response.includes(line)) {
        flags.push("journal_leak");
        reasons.push(
          `Journal content leak detected: ${line.length}-char verbatim match`,
        );
        break; // One match is enough
      }
    }

    // Also check for longer contiguous sequences (3+ word phrases that appear
    // in journal but wouldn't appear in normal astrological interpretation)
    // This catches cases where the model paraphrases but echoes specific phrases
    const journalPhrases = extractDistinctPhrases(journalContext);
    let phraseLeakCount = 0;
    for (const phrase of journalPhrases) {
      if (response.toLowerCase().includes(phrase.toLowerCase())) {
        phraseLeakCount++;
      }
    }
    // If 3+ distinct journal phrases appear in the response, it's likely a leak
    if (phraseLeakCount >= 3 && !flags.includes("journal_leak")) {
      flags.push("journal_leak");
      reasons.push(
        `Journal content leak detected: ${phraseLeakCount} distinct phrases echoed`,
      );
    }
  }

  // ── 4. Identity leaks ──────────────────────────────────────────────
  for (const { pattern, description } of IDENTITY_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      flags.push("identity_leak");
      reasons.push(`Identity leak: ${description}`);
      break;
    }
  }

  const blocked = flags.length > 0;
  return {
    safe: !blocked,
    blocked,
    flags,
    reason: blocked ? reasons.join("; ") : undefined,
  };
}

/**
 * Detect whether a response is a model refusal on a benign question.
 *
 * Returns a RefusalCheckResult with confidence level:
 * - "high": Clear refusal language like "I can't help with that"
 * - "medium": Softer language like "As an AI..." that might just be hedging
 *
 * @param response The LLM response to check
 * @returns RefusalCheckResult indicating if and how confidently this is a refusal
 */
export function detectRefusal(response: string): RefusalCheckResult {
  // Check high-confidence patterns first
  for (const { pattern, description } of REFUSAL_PATTERNS_HIGH) {
    if (pattern.test(response)) {
      return {
        isRefusal: true,
        confidence: "high",
        matchedPattern: description,
      };
    }
  }

  // Check medium-confidence patterns
  for (const { pattern, description } of REFUSAL_PATTERNS_MEDIUM) {
    if (pattern.test(response)) {
      return {
        isRefusal: true,
        confidence: "medium",
        matchedPattern: description,
      };
    }
  }

  return { isRefusal: false, confidence: "medium" };
}

/**
 * Extract distinct, meaningful phrases from journal context.
 * Used for detecting paraphrased leaks (not just verbatim).
 *
 * Returns phrases of 3+ words that are specific enough to be identifying.
 * @private Internal helper for scanResponse.
 */
function extractDistinctPhrases(journalContext: string): string[] {
  // Remove common journal context framing tags
  const content = journalContext
    .replace(/\[(JOURNAL CONTEXT|END JOURNAL CONTEXT)[^\]]*\]/gi, "")
    .replace(/\[ENTRY[^\]]*\]/gi, "")
    .replace(/\n{3,}/g, "\n\n");

  const phrases: string[] = [];

  // Extract phrases of 3-6 words from sentences
  const sentences = content.split(/[.!?\n]+/);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter((w) => w.length > 2);
    if (words.length < 3) continue;

    // Generate overlapping 3-6 word phrases
    for (let len = 3; len <= Math.min(6, words.length); len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(" ");
        // Skip very common phrases
        if (
          phrase.length < 15 || // Too short to be distinctive
          /^(i\s+feel|i\s+think|i\s+am|i\s+was|i\s+have|i\s+notice)/i.test(
            phrase,
          )
        ) {
          continue;
        }
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}