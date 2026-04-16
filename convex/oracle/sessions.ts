import { query, mutation, internalMutation, action, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "../_generated/api";
import { buildProviderUrl, buildProviderHeaders } from "../../lib/oracle/providers";

export const getUserSessions = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const sessions = await ctx.db
            .query("oracle_sessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50);

        const withCategory = await Promise.all(
            sessions.map(async (s) => {
                const category = s.categoryId
                    ? await ctx.db.get(s.categoryId)
                    : null;
                return {
                    ...s,
                    categoryName: category?.name ?? null,
                    categoryIcon: category?.icon ?? null,
                };
            })
        );

        return withCategory;
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

        const followUpAnswers = await ctx.db
            .query("oracle_follow_up_answers")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .collect();

        const category = session.categoryId
            ? await ctx.db.get(session.categoryId)
            : null;

        return {
            ...session,
            messages,
            followUpAnswers,
            categoryName: category?.name ?? null,
            categoryIcon: category?.icon ?? null,
        };
    },
});

export const createSession = mutation({
    args: {
        categoryId: v.optional(v.id("oracle_categories")),
        templateId: v.optional(v.id("oracle_templates")),
        featureKey: v.optional(v.string()),
        questionText: v.string(),
        requiresFollowUps: v.boolean(),
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
            categoryId: args.categoryId,
            templateId: args.templateId,
            featureKey: args.featureKey,
            status: args.requiresFollowUps ? "collecting_context" : "active",
            messageCount: 1,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        });

        await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "user",
            content: args.questionText,
            isFollowUpQuestion: false,
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
            v.literal("follow_up_prompt"),
        ),
        content: v.string(),
        isFollowUpQuestion: v.optional(v.boolean()),
        followUpId: v.optional(v.id("oracle_follow_ups")),
        modelUsed: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        fallbackTierUsed: v.optional(v.union(
            v.literal("A"),
            v.literal("B"),
            v.literal("C"),
            v.literal("D"),
        )),
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
            isFollowUpQuestion: args.isFollowUpQuestion ?? false,
            followUpId: args.followUpId,
            modelUsed: args.modelUsed,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            fallbackTierUsed: args.fallbackTierUsed,
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
            v.literal("collecting_context"),
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

export const saveFollowUpAnswer = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        followUpId: v.id("oracle_follow_ups"),
        answer: v.string(),
        skipped: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) {
            throw new Error("Session not found");
        }

        await ctx.db.insert("oracle_follow_up_answers", {
            sessionId: args.sessionId,
            followUpId: args.followUpId,
            answer: args.answer,
            skipped: args.skipped,
            answeredAt: Date.now(),
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
            isFollowUpQuestion: false,
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
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            content: args.content,
            modelUsed: args.modelUsed,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            fallbackTierUsed: args.fallbackTierUsed,
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
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, {
            title: args.title,
            titleGenerated: true,
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
            // "none" means unstar — clear the field entirely
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

        // First find related messages
        const messages = await ctx.db
            .query("oracle_messages")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();
        
        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        // Then related follow-up answers
        const answers = await ctx.db
            .query("oracle_follow_up_answers")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();

        for (const answer of answers) {
            await ctx.db.delete(answer._id);
        }

        await ctx.db.delete(args.sessionId);
    },
});

export const getFirstQuestion = internalQuery({
    args: { sessionId: v.id("oracle_sessions") },
    handler: async (ctx, { sessionId }) => {
        const msg = await ctx.db
            .query("oracle_messages")
            .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
            .first();
        return msg?.content;
    }
});

export const generateSessionTitle = action({
    args: {
        sessionId: v.id("oracle_sessions"),
    },
    handler: async (ctx, args) => {
        const questionText = await ctx.runQuery(internal.oracle.sessions.getFirstQuestion, {
            sessionId: args.sessionId,
        });

        if (!questionText) return;

        const runtimeSettings = await ctx.runQuery(
            api.oracle.settings.getPromptRuntimeSettings,
            {},
        );

        const providers = (runtimeSettings as any).providers || [];
        const modelChain = (runtimeSettings as any).modelChain || [];

        const systemPrompt = `You are a helpful assistant that generates a short, engaging title for a user's question.
Rules:
1. Max 5 words for title.
2. Output MUST be ONLY valid JSON in format: {"title": "Title Here"}`;

        const config = {
            temperature: 0.3,
            maxTokens: 50,
            topP: 0.9,
        };

        for (let i = 0; i < modelChain.length; i++) {
            const entry = modelChain[i];
            const provider = providers.find((p: any) => p.id === entry.providerId);
            if (!provider) continue;

            const apiKey = process.env[provider.apiKeyEnvVar];
            if (provider.type !== "ollama" && !apiKey) continue;

            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Question: ${questionText}` }
            ];

            const url = buildProviderUrl(provider);
            const headers = buildProviderHeaders(provider, apiKey);

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        model: entry.model,
                        messages,
                        temperature: config.temperature,
                        max_tokens: config.maxTokens,
                        top_p: config.topP,
                        response_format: { type: "json_object" },
                    })
                });

                if (!response.ok) continue;

                const data = await response.json();
                const content = (data as any).choices?.[0]?.message?.content;
                
                if (content) {
                    try {
                        const parsed = JSON.parse(content);
                        const cleanTitle = parsed.title?.replace(/["']/g, "") || "New Reading";
                        
                        await ctx.runMutation(internal.oracle.sessions.updateSessionTitle, {
                            sessionId: args.sessionId,
                            title: cleanTitle,
                        });
                        return; // Done
                    } catch (e) {
                        console.error("Failed to parse JSON for title generation", e);
                    }
                }
            } catch (err) {
                console.error("Title generation fail for provider:", provider.id, err);
            }
        }
    }
});
