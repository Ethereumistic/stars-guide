/**
 * search.ts — Full-text search for journal entries.
 *
 * Uses Convex searchIndex on journal_entries content field,
 * with secondary in-memory filtering for tags and moon phase.
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const searchEntries = query({
    args: {
        query: v.string(),
        entryType: v.optional(v.union(
            v.literal("freeform"),
            v.literal("checkin"),
            v.literal("dream"),
            v.literal("gratitude"),
        )),
        moodZone: v.optional(v.union(
            v.literal("excited"),
            v.literal("content"),
            v.literal("tense"),
            v.literal("low"),
        )),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        moonPhase: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const searchTerm = args.query.trim();
        if (!searchTerm) return [];

        // Use Convex full-text search index
        const searchResults = await ctx.db
            .query("journal_entries")
            .withSearchIndex("search_content", (q) => {
                const q2 = q.search("content", searchTerm).eq("userId", userId);
                // Apply optional filters
                let q3 = q2;
                if (args.entryType) q3 = q3.eq("entryType", args.entryType) as any;
                if (args.moodZone) q3 = q3.eq("moodZone", args.moodZone) as any;
                return q3;
            })
            .collect();

        // Secondary in-memory filtering for fields not in the search index
        let filtered = searchResults;

        // Filter by date range
        if (args.startDate) {
            filtered = filtered.filter((e) => e.entryDate >= args.startDate!);
        }
        if (args.endDate) {
            filtered = filtered.filter((e) => e.entryDate <= args.endDate!);
        }

        // Filter by tags (array intersection — entry must contain ALL specified tags)
        if (args.tags && args.tags.length > 0) {
            filtered = filtered.filter((e) => {
                const entryTags = e.tags ?? [];
                return args.tags!.every((tag) => entryTags.includes(tag));
            });
        }

        // Filter by moon phase (from astroContext)
        if (args.moonPhase) {
            filtered = filtered.filter(
                (e) => e.astroContext?.moonPhase?.toLowerCase().includes(args.moonPhase!.toLowerCase()),
            );
        }

        return filtered;
    },
});