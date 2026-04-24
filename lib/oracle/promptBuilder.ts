import { ORACLE_SAFETY_RULES } from "./safetyRules";

/**
 * Title directive appended to Oracle system prompts on the first message only.
 *
 * Instructs the model to output a short session title on a final line.
 * This is parsed out of the response and persisted as the session title,
 * replacing the old separate title-generation LLM chain.
 *
 * Only included on the first response to save ~200 tokens on follow-ups.
 * The model already has full context of the question + its own answer,
 * so it produces a better title than a cold call to a separate model would.
 */
export const ORACLE_TITLE_DIRECTIVE = [
  "[SESSION TITLE]",
  "On the very last line of your response, output: TITLE: <4-6 word session summary>",
  "This line will be used as metadata, not shown to the user.",
].join("\n");

/**
 * Directive for Oracle to suggest journal prompts when emotional themes are detected.
 * Only included on first response when journal context is present.
 */
export const JOURNAL_PROMPT_DIRECTIVE = [
  "[JOURNAL PROMPT SUGGESTION]",
  "If your response touched on emotional themes the user might want to journal about,",
  "you MAY optionally add a line: JOURNAL_PROMPT: <a reflective question for journaling>",
  "This is optional — only include it when it feels natural and helpful.",
  "[END JOURNAL PROMPT SUGGESTION]",
].join("\n");

export interface PromptPayload {
  systemPrompt: string;
  userMessage: string;
}

/**
 * Build the system prompt: Safety Rules + Soul Doc + Feature Injection + Journal Context + Title Directive (first response only).
 *
 * Clean layered structure:
 *   1. ORACLE_SAFETY_RULES (hardcoded, always first)
 *   2. soulDoc (one unified document)
 *   3. featureInjection (if active feature has one)
 *   3.5. timespaceContext (always: local datetime; expanded when temporal intent detected)
 *   4. journalContext (if consent granted and data available)
 *   5. ORACLE_TITLE_DIRECTIVE (only on first response — saves ~200 tokens on follow-ups)
 *   6. JOURNAL_PROMPT_DIRECTIVE (only on first response when journal context is present)
 */
export function buildSystemPrompt(params: {
  soulDoc: string;
  featureInjection?: string | null;
  timespaceContext?: string | null;
  journalContext?: string | null;
  isFirstResponse?: boolean;
}): string {
  const blocks = [
    ORACLE_SAFETY_RULES,
    params.soulDoc,
    params.featureInjection ?? "",
    params.timespaceContext ?? "",
    params.journalContext ?? "",
  ];

  // Only include title directive on the first response — saves ~200 tokens on follow-ups
  if (params.isFirstResponse !== false) {
    blocks.push(ORACLE_TITLE_DIRECTIVE);
  }

  // Also include the journal prompt directive on first response if journal context is provided
  if (params.isFirstResponse !== false && params.journalContext) {
    blocks.push(JOURNAL_PROMPT_DIRECTIVE);
  }

  return blocks.filter(Boolean).join("\n\n");
}

/**
 * Build the user message: Natal Chart Data (if present) + User Question.
 *
 * Strips any [SYSTEM, [NATAL, [USER tagged content from the raw user question
 * to mitigate tag injection attacks.
 */
export function buildUserMessage(params: {
  natalContext?: string | null;
  userQuestion: string;
}): string {
  const sanitizedQuestion = sanitizeUserQuestion(params.userQuestion);

  const parts: string[] = [];
  if (params.natalContext) {
    parts.push(`[NATAL CHART DATA]\n${params.natalContext}`);
  }
  parts.push(sanitizedQuestion);

  return parts.join("\n\n");
}

/**
 * Build the complete prompt payload.
 */
export function buildPrompt(params: {
  soulDoc: string;
  featureInjection?: string | null;
  natalContext?: string | null;
  userQuestion: string;
  isFirstResponse?: boolean;
  journalContext?: string | null;
  timespaceContext?: string | null;
}): PromptPayload {
  return {
    systemPrompt: buildSystemPrompt({
      soulDoc: params.soulDoc,
      featureInjection: params.featureInjection,
      timespaceContext: params.timespaceContext,
      journalContext: params.journalContext,
      isFirstResponse: params.isFirstResponse,
    }),
    userMessage: buildUserMessage({
      natalContext: params.natalContext,
      userQuestion: params.userQuestion,
    }),
  };
}

/**
 * Strip any tagged content from the user's raw text that could confuse
 * the prompt structure. Prevents users from injecting [NATAL CHART DATA],
 * [USER QUESTION], [SYSTEM], etc. into their messages.
 */
export function sanitizeUserQuestion(raw: string): string {
  return raw
    .replace(/\[(SYSTEM|NATAL|USER|FEATURE|SAFETY|END)[^\]]*\]/gi, "")
    .trim();
}

/**
 * Parse a TITLE: line from the end of the Oracle response.
 *
 * Looks for a line matching `TITLE: <text>` (case-insensitive) in the response.
 * If found, extracts the title text and returns both the cleaned content
 * (without the TITLE line) and the title string.
 *
 * If no TITLE: line is found, returns the original content unchanged with title: null.
 * This is the expected fallback — the session keeps its placeholder truncated-question title.
 */
export function parseTitleFromResponse(content: string): {
  title: string | null;
  contentWithoutTitle: string;
} {
  // Match "TITLE:" on its own line, possibly with surrounding whitespace,
  // anywhere in the response (but typically at the end).
  // Case-insensitive to handle model variation.
  const titleRegex = /^\s*TITLE:\s*(.+?)\s*$/im;
  const match = content.match(titleRegex);

  if (!match) {
    return { title: null, contentWithoutTitle: content };
  }

  let title = match[1].trim();

  // Strip surrounding quotes the model might add
  title = title.replace(/^["']|["']$/g, "");

  // Enforce max length of 60 characters (matching prior behavior)
  if (title.length > 60) {
    title = title.slice(0, 60);
  }

  // Remove the TITLE: line from the content
  const lines = content.split("\n");
  const titleLineIndex = lines.findIndex((line) => titleRegex.test(line));

  let contentWithoutTitle: string;
  if (titleLineIndex !== -1) {
    const cleanedLines = lines.filter((_, idx) => idx !== titleLineIndex);
    contentWithoutTitle = cleanedLines.join("\n").trim();
  } else {
    contentWithoutTitle = content;
  }

  // Sanity check: if the stripped title is empty, treat as not found
  if (!title) {
    return { title: null, contentWithoutTitle: content };
  }

  return { title, contentWithoutTitle };
}

/**
 * Derive a title from the Oracle response when the model didn't output a TITLE: line.
 * 1. Take the first sentence of the response (up to the first period/punct)
 * 2. Truncate to max 60 chars if needed
 * 3. Strip Oracle-style suffixes ("->", etc.)
 *
 * This is a fallback — it's not as good as a proper TITLE: line, but it's
 * much better than the truncated-question placeholder.
 */
export function deriveTitleFromContent(content: string): string {
  // Remove common Oracle formatting artifacts
  const cleaned = content
    .replace(/\s*->\s*$/gm, "") // Remove arrow suffixes
    .replace(/[★✦✧✨⋄◇◆●○☉☽♈♉♊♋♌♍♎♏♐♑♒♓]+/g, "") // Remove astro symbols
    .trim();

  // Take the first sentence (up to period, exclamation, question mark, or newline)
  const firstSentenceMatch = cleaned.match(/^(.+?[.!?])(\s|$)/);
  let title = firstSentenceMatch ? firstSentenceMatch[1] : cleaned.split("\n")[0];

  // If the first sentence is too short (< 10 chars), try the first line
  if (title.length < 10) {
    title = cleaned.split("\n")[0] || cleaned.slice(0, 60);
  }

  // Truncate to max 60 chars, breaking at word boundary
  if (title.length > 60) {
    title = title.slice(0, 60);
    const lastSpace = title.lastIndexOf(" ");
    if (lastSpace > 20) {
      title = title.slice(0, lastSpace);
    }
  }

  return title.trim();
}

/**
 * Parse a JOURNAL_PROMPT: line from the Oracle response.
 *
 * Looks for a line matching `JOURNAL_PROMPT: <text>` (case-insensitive).
 * If found, extracts the prompt text and returns both the cleaned content
 * (without the JOURNAL_PROMPT: line) and the prompt string.
 *
 * If no JOURNAL_PROMPT: line is found, returns the original content with prompt: null.
 */
export function parseJournalPromptFromResponse(content: string): {
  journalPrompt: string | null;
  contentWithoutPrompt: string;
} {
  const promptRegex = /^\s*JOURNAL_PROMPT:\s*(.+?)\s*$/im;
  const match = content.match(promptRegex);

  if (!match) {
    return { journalPrompt: null, contentWithoutPrompt: content };
  }

  let journalPrompt = match[1].trim();

  // Strip surrounding quotes
  journalPrompt = journalPrompt.replace(/^["']|["']$/g, "");

  // Enforce max length of 200 characters
  if (journalPrompt.length > 200) {
    journalPrompt = journalPrompt.slice(0, 200);
  }

  // Remove the JOURNAL_PROMPT: line from content
  const lines = content.split("\n");
  const promptLineIndex = lines.findIndex((line) => promptRegex.test(line));

  let contentWithoutPrompt: string;
  if (promptLineIndex !== -1) {
    const cleanedLines = lines.filter((_, idx) => idx !== promptLineIndex);
    contentWithoutPrompt = cleanedLines.join("\n").trim();
  } else {
    contentWithoutPrompt = content;
  }

  if (!journalPrompt) {
    return { journalPrompt: null, contentWithoutPrompt: content };
  }

  return { journalPrompt, contentWithoutPrompt };
}