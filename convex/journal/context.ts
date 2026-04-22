/**
 * context.ts — Assembles journal context for Oracle system prompts.
 *
 * Phase 4: Builds the [JOURNAL CONTEXT] block that Oracle reads
 * to give personalized readings referencing the user's emotional state.
 *
 * Called by invokeOracle (non-blocking — if it fails, Oracle proceeds without context).
 */
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { ORACLE_JOURNAL_CONTEXT, INTENSITY_LABELS } from "../../src/lib/journal/constants";

const INTENSITY_WORDS: Record<number, string> = {
    1: "mildly",
    2: "moderately",
    3: "strongly",
};

export const assembleJournalContext = internalQuery({
    args: {
        userId: v.id("users"),
        expandedBudget: v.optional(v.boolean()), // For Cosmic Recall: double the budget
    },
    handler: async (ctx, { userId, expandedBudget }) => {
        // 1. Fetch consent
        const consent = await ctx.db
            .query("journal_consent")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!consent || !consent.oracleCanReadJournal) {
            return null;
        }

        // 2. Query recent entries
        const lookbackMs = consent.lookbackDays * 86400000;
        const cutoffTime = Date.now() - lookbackMs;

        const allEntries = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_created", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        // Filter by lookback window and limit
        const recentEntries = allEntries
            .filter((e) => e.createdAt >= cutoffTime)
            .slice(0, ORACLE_JOURNAL_CONTEXT.MAX_ENTRIES_IN_CONTEXT * (expandedBudget ? 2 : 1));

        if (recentEntries.length === 0) {
            return null;
        }

        // 3. Build entry summaries respecting consent granularity
        const entrySummaries: string[] = [];
        let totalChars = 0;
        const budget = expandedBudget ? ORACLE_JOURNAL_CONTEXT.BUDGET_CHARS * 2 : ORACLE_JOURNAL_CONTEXT.BUDGET_CHARS;
        const maxEntryChars = expandedBudget ? ORACLE_JOURNAL_CONTEXT.MAX_ENTRY_CHARS * 2 : ORACLE_JOURNAL_CONTEXT.MAX_ENTRY_CHARS;

        for (const entry of recentEntries) {
            const lines: string[] = [];

            // Always include: entryDate, entryType, moodZone
            const zoneLabel = entry.moodZone ?? "unknown";
            const arousal = entry.mood?.arousal;
            const arousalLabel =
                arousal !== undefined
                    ? arousal >= 1 ? "high" : arousal <= -1 ? "low" : "moderate"
                    : undefined;

            let header = `---ENTRY ${entry.entryDate} (zone: ${zoneLabel}`;
            if (entry.entryType !== "freeform") header += `, ${entry.entryType}`;
            if (arousalLabel) header += `, arousal: ${arousalLabel}`;
            header += `)---`;
            lines.push(header);

            // Moon phase (always included if available)
            if (entry.astroContext?.moonPhase) {
                lines.push(`Moon Phase: ${entry.astroContext.moonPhase}`);
            }

            // Mood data (if consented)
            if (consent.includeMoodData && entry.emotions && entry.emotions.length > 0) {
                const emotionLabels = entry.emotions
                    .map((e) => `${INTENSITY_WORDS[e.intensity] ?? "moderately"} ${e.key}`)
                    .join(", ");
                lines.push(`Emotions: ${emotionLabels}`);
            }

            // Mood zone detail (if consented)
            if (consent.includeMoodData && entry.mood) {
                lines.push(`Energy: ${entry.energyLevel ?? "?"}/5`);
            }

            // Entry content (if consented), truncated
            if (consent.includeEntryContent && entry.content) {
                const truncated = entry.content.slice(0, maxEntryChars);
                lines.push(`"${truncated}${entry.content.length > maxEntryChars ? "..." : ""}"`);
            }

            // Dream data (if consented)
            if (consent.includeDreamData && entry.dreamData) {
                const dreamParts: string[] = ["Dream:"];
                if (entry.dreamData.isRecurring) dreamParts.push("recurring");
                if (entry.dreamData.isLucid) dreamParts.push("lucid");
                if (dreamParts.length === 1) dreamParts.push("standard");

                if (entry.dreamData.dreamSigns && entry.dreamData.dreamSigns.length > 0) {
                    dreamParts.push(`Signs: ${entry.dreamData.dreamSigns.join(", ")}`);
                }
                if (entry.dreamData.emotionalTone) {
                    dreamParts.push(`Tone: ${entry.dreamData.emotionalTone}`);
                }
                lines.push(dreamParts.join(" "));
            }

            lines.push("---END ENTRY---");

            const summary = lines.join("\n");
            const summaryLength = summary.length + 1; // +1 for newline

            if (totalChars + summaryLength > budget) {
                break; // Budget exceeded
            }

            entrySummaries.push(summary);
            totalChars += summaryLength;
        }

        if (entrySummaries.length === 0) {
            return null;
        }

        // 4. Format the complete [JOURNAL CONTEXT] block
        const contextBlock = [
            "[JOURNAL CONTEXT]",
            "The user has consented to sharing their recent journal entries.",
            "Here are summaries of their most recent reflections:",
            "",
            ...entrySummaries,
            "",
            "[END JOURNAL CONTEXT]",
            "Use this context to give more personalized, empathetic, and informed readings.",
            "Reference their experiences naturally when relevant. Do not quote their journal",
            "verbatim unless they ask you to reference it.",
            "The mood data uses a 2D model: \"zone\" reflects the valence×arousal quadrant.",
            "Emotion intensity ranges from mild (1) to strong (3) — weight your interpretation accordingly.",
        ].join("\n");

        return contextBlock;
    },
});