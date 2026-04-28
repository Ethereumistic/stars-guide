import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

export const getUserSessions = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("oracle_sessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50);
    },
});

export const getSessionWithMessages = query({
    args: { sessionId: v.id("oracle_sessions") },
    handler: async (ctx, { sessionId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const session = await ctx.db.get(sessionId);
        if (!session || session.userId !== userId) return null;

        const messages = await ctx.db
            .query("oracle_messages")
            .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
            .order("asc")
            .collect();

        return {
            ...session,
            messages,
        };
    },
});

export const createSession = mutation({
    args: {
        featureKey: v.optional(v.string()),
        questionText: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const now = Date.now();
        const title = args.questionText.length > 40
            ? args.questionText.substring(0, 40) + "..."
            : args.questionText;

        const sessionId = await ctx.db.insert("oracle_sessions", {
            userId,
            title,
            featureKey: args.featureKey,
            status: "active",
            messageCount: 1,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        });

        await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "user",
            content: args.questionText,
            createdAt: now,
        });

        return sessionId;
    },
});

export const addMessage = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        role: v.union(
            v.literal("user"),
            v.literal("assistant"),
        ),
        content: v.string(),
        modelUsed: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        fallbackTierUsed: v.optional(v.union(
            v.literal("A"),
            v.literal("B"),
            v.literal("C"),
            v.literal("D"),
        )),
        journalPrompt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) {
            throw new Error("Session not found");
        }

        const now = Date.now();

        await ctx.db.insert("oracle_messages", {
            sessionId: args.sessionId,
            role: args.role,
            content: args.content,
            modelUsed: args.modelUsed,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            fallbackTierUsed: args.fallbackTierUsed,
            journalPrompt: args.journalPrompt,
            createdAt: now,
        });

        await ctx.db.patch(args.sessionId, {
            messageCount: session.messageCount + 1,
            updatedAt: now,
            lastMessageAt: now,
            ...(args.role === "assistant" && args.modelUsed
                ? { primaryModelUsed: args.modelUsed }
                : {}),
            ...(args.fallbackTierUsed && args.fallbackTierUsed !== "A"
                ? { usedFallback: true }
                : {}),
        });
    },
});

export const updateSessionStatus = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        status: v.union(
            v.literal("active"),
            v.literal("completed"),
        ),
    },
    handler: async (ctx, { sessionId, status }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(sessionId);
        if (!session || session.userId !== userId) {
            throw new Error("Session not found");
        }

        await ctx.db.patch(sessionId, {
            status,
            updatedAt: Date.now(),
        });
    },
});

export const updateSessionFeature = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        featureKey: v.optional(v.string()),
    },
    handler: async (ctx, { sessionId, featureKey }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(sessionId);
        if (!session || session.userId !== userId) {
            throw new Error("Session not found");
        }

        await ctx.db.patch(sessionId, {
            featureKey,
            updatedAt: Date.now(),
        });
    },
});

export const updateSessionBirthChartDepth = internalMutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        depth: v.union(v.literal("core"), v.literal("full")),
    },
    handler: async (ctx, { sessionId, depth }) => {
        await ctx.db.patch(sessionId, {
            birthChartDepth: depth,
            updatedAt: Date.now(),
        });
    },
});

export const createStreamingMessage = internalMutation({
    args: { sessionId: v.id("oracle_sessions") },
    handler: async (ctx, { sessionId }) => {
        const session = await ctx.db.get(sessionId);
        if (!session) throw new Error("Session not found");

        const now = Date.now();
        const messageId = await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "assistant",
            content: "",
            createdAt: now,
        });

        await ctx.db.patch(sessionId, {
            messageCount: session.messageCount + 1,
            updatedAt: now,
            lastMessageAt: now,
        });

        return messageId;
    },
});

export const updateStreamingContent = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        content: v.string(),
    },
    handler: async (ctx, { messageId, content }) => {
        await ctx.db.patch(messageId, { content });
    },
});

export const finalizeStreamingMessage = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        sessionId: v.id("oracle_sessions"),
        content: v.string(),
        modelUsed: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        fallbackTierUsed: v.optional(v.union(
            v.literal("A"),
            v.literal("B"),
            v.literal("C"),
            v.literal("D"),
        )),
        systemPromptHash: v.optional(v.string()),
        journalPrompt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            content: args.content,
            modelUsed: args.modelUsed,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            fallbackTierUsed: args.fallbackTierUsed,
            systemPromptHash: args.systemPromptHash,
            ...(args.journalPrompt ? { journalPrompt: args.journalPrompt } : {}),
        });
        await ctx.db.patch(args.sessionId, {
            ...(args.modelUsed ? { primaryModelUsed: args.modelUsed } : {}),
            ...(args.fallbackTierUsed && args.fallbackTierUsed !== "A"
                ? { usedFallback: true }
                : {}),
            status: "active" as const,
            updatedAt: Date.now(),
        });
    },
});

export const updateSessionTitle = internalMutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        title: v.string(),
        titleGenerated: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, {
            title: args.title,
            titleGenerated: args.titleGenerated ?? true,
            updatedAt: Date.now(),
        });
    },
});

export const renameSession = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) throw new Error("Session not found");

        await ctx.db.patch(args.sessionId, {
            title: args.title,
            updatedAt: Date.now(),
        });
    },
});

export const setSessionStarType = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        starType: v.optional(v.union(v.literal("beveled"), v.literal("cursed"), v.literal("none"))),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) throw new Error("Session not found");

        await ctx.db.patch(args.sessionId, {
            ...(args.starType === "none" || !args.starType
                ? { starType: undefined }
                : { starType: args.starType }),
            updatedAt: Date.now(),
        });
    },
});

export const deleteSession = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) throw new Error("Session not found");

        const messages = await ctx.db
            .query("oracle_messages")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();
        
        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        await ctx.db.delete(args.sessionId);
    },
});