import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { BIRTH_CHART_REPORT_WELCOME } from "../birthChartReport/onboarding";
import { resolveOracleRouteForUser } from "../aiGateway/userModelOptions";

const reasoningEffort = v.union(
    v.literal("auto"),
    v.literal("disabled"),
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
);

/** 
 * Resolve a Convex file-storage ID to a playback URL for an audio file.
 * Used by the client to turn message.audioStorageId into an <audio src> URL.
 */
export const getAudioUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        return await ctx.storage.getUrl(storageId);
    },
});

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
        modelOptionKey: v.optional(v.string()),
        reasoningEffort: v.optional(reasoningEffort),
        synastryPayload: v.optional(v.object({
            chartB: v.any(), // StoredBirthData shape
            source: v.union(v.literal("friend"), v.literal("custom")),
            friendUserId: v.optional(v.id("users")),
            relationship: v.string(),
            relationshipCategory: v.optional(v.string()),
            chartBName: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");
        const route = await resolveOracleRouteForUser(
            ctx,
            user,
            args.modelOptionKey,
            args.reasoningEffort,
        );

        const now = Date.now();
        const title = args.questionText.length > 40
            ? args.questionText.substring(0, 40) + "..."
            : args.questionText;

        const sessionId = await ctx.db.insert("oracle_sessions", {
            userId,
            title,
            featureKey: args.featureKey,
            modelOptionKey: route.optionKey,
            modelRouteFallbackReason: route.fallbackReason,
            reasoningEffort: route.reasoningEffort,
            status: "active",
            messageCount: 1,
            synastryPayload: args.synastryPayload,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        });

        await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "user",
            content: args.questionText,
            requestedModelOptionKey: args.modelOptionKey,
            requestedReasoningEffort: args.reasoningEffort,
            createdAt: now,
        });

        return sessionId;
    },
});

export const createBirthChartReportSession = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user?.birthData) throw new Error("Birth data is required before creating a Birth Chart Report session");
        const existingSessionId = user?.birthChartReport?.oracleSessionId;
        if (existingSessionId) {
            const existing = await ctx.db.get(existingSessionId);
            if (existing && existing.userId === userId) {
                const existingReport = user.birthChartReport;
                if (existingReport && existingReport.status !== "completed" && !existingReport.onboardingStep) {
                    const messages = await ctx.db
                        .query("oracle_messages")
                        .withIndex("by_session_created", (q) => q.eq("sessionId", existingSessionId))
                        .collect();
                    const hasAssistant = messages.some((message) => message.role === "assistant");
                    if (!hasAssistant) {
                        await ctx.db.insert("oracle_messages", {
                            sessionId: existingSessionId,
                            role: "assistant",
                            content: BIRTH_CHART_REPORT_WELCOME,
                            createdAt: Date.now(),
                        });
                        await ctx.db.patch(existingSessionId, {
                            messageCount: existing.messageCount + 1,
                            updatedAt: Date.now(),
                            lastMessageAt: Date.now(),
                        });
                    }
                    await ctx.db.patch(userId, {
                        birthChartReport: {
                            ...existingReport,
                            status: "pending",
                            onboardingStep: "questionnaire",
                            profilingAnswers: existingReport.profilingAnswers ?? {},
                            errorMessage: undefined,
                        },
                    });
                }
                return existingSessionId;
            }
        }

        const now = Date.now();
        const sessionId = await ctx.db.insert("oracle_sessions", {
            userId,
            title: "Birth Chart Report",
            titleGenerated: true,
            featureKey: "birth_chart_report",
            status: "active",
            messageCount: 2,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        });

        await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "user",
            content: "Show me the shape of my birth chart.",
            createdAt: now,
        });

        await ctx.db.insert("oracle_messages", {
            sessionId,
            role: "assistant",
            content: BIRTH_CHART_REPORT_WELCOME,
            createdAt: now + 1,
        });

        await ctx.db.patch(userId, {
            birthChartReport: {
                ...(user?.birthChartReport ?? { status: "pending" as const }),
                status: "pending",
                onboardingStep: "questionnaire",
                profilingAnswers: user?.birthChartReport?.profilingAnswers ?? {},
                oracleSessionId: sessionId,
                errorMessage: undefined,
            },
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
        audioData: v.optional(v.string()),
        audioStorageId: v.optional(v.id("_storage")),
        audioUrl: v.optional(v.string()),
        modelOptionKey: v.optional(v.string()),
        reasoningEffort: v.optional(reasoningEffort),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== userId) {
            throw new Error("Session not found");
        }

        const now = Date.now();
        const currentUser = await ctx.db.get(userId);
        if (!currentUser) throw new Error("User not found");

        const route = args.role === "user"
            ? await resolveOracleRouteForUser(
                ctx,
                currentUser,
                args.modelOptionKey ?? session.modelOptionKey,
                args.reasoningEffort ?? session.reasoningEffort,
            )
            : null;

        const messageId = await ctx.db.insert("oracle_messages", {
            sessionId: args.sessionId,
            role: args.role,
            content: args.content,
            modelUsed: args.modelUsed,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            fallbackTierUsed: args.fallbackTierUsed,
            journalPrompt: args.journalPrompt,
            audioData: args.audioData,
            audioStorageId: args.audioStorageId,
            audioUrl: args.audioUrl,
            requestedModelOptionKey: args.modelOptionKey,
            requestedReasoningEffort: args.reasoningEffort,
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
            ...(route
                ? {
                    modelOptionKey: route.optionKey,
                    modelRouteFallbackReason: route.fallbackReason,
                    reasoningEffort: route.reasoningEffort,
                }
                : {}),
        });
        return messageId;
    },
});

/**
 * Phase D conversation subscription. One authenticated query returns the
 * transcript plus the durable lifecycle rows needed to render it, avoiding a
 * client query per message or section.
 */
export const getSessionConversation = query({
    args: { sessionId: v.id("oracle_sessions") },
    handler: async (ctx, { sessionId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const session = await ctx.db.get(sessionId);
        if (!session || session.userId !== userId) return null;

        const [messages, turnDocs] = await Promise.all([
            ctx.db
                .query("oracle_messages")
                .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
                .order("asc")
                .collect(),
            ctx.db
                .query("oracle_turns")
                .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
                .order("asc")
                .collect(),
        ]);

        const messageTurnIds = new Set(
            messages.flatMap((message) => message.turnId ? [String(message.turnId)] : []),
        );
        const relevantTurns = turnDocs.filter((turn) => messageTurnIds.has(String(turn._id)));
        const sectionGroups = await Promise.all(
            relevantTurns.map((turn) => ctx.db
                .query("oracle_turn_sections")
                .withIndex("by_turn_ordinal", (q) => q.eq("turnId", turn._id))
                .order("asc")
                .collect()),
        );

        const turns = relevantTurns.map((turn) => ({
            _id: turn._id,
            userMessageId: turn.userMessageId,
            assistantMessageId: turn.assistantMessageId,
            retryOfTurnId: turn.retryOfTurnId,
            status: turn.status,
            active: turn.active,
            publicationMode: turn.publicationMode,
            protocolVersion: turn.protocolVersion,
            currentSectionKey: turn.currentSectionKey,
            requiredSectionKeys: turn.requiredSectionKeys,
            publishedSectionKeys: turn.publishedSectionKeys,
            lastSequence: turn.lastSequence,
            publishedChars: turn.publishedChars,
            partial: turn.partial,
            safeErrorCode: turn.safeErrorCode,
            safeErrorMessage: turn.safeErrorMessage,
            createdAt: turn.createdAt,
            updatedAt: turn.updatedAt,
            completedAt: turn.completedAt,
            failedAt: turn.failedAt,
            cancelledAt: turn.cancelledAt,
        }));
        const sections = sectionGroups.flat().map((section) => ({
            _id: section._id,
            turnId: section.turnId,
            key: section.key,
            ordinal: section.ordinal,
            title: section.title,
            status: section.status,
            content: section.content,
            publishedAt: section.publishedAt,
            updatedAt: section.updatedAt,
        }));

        return {
            ...session,
            messages,
            turns,
            sections,
            activeTurn: turns.find((turn) => turn.active) ?? null,
        };
    },
});

export const patchModelRouteResolution = internalMutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        modelOptionKey: v.optional(v.string()),
        reasoningEffort,
        fallbackReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, {
            modelOptionKey: args.modelOptionKey,
            reasoningEffort: args.reasoningEffort,
            modelRouteFallbackReason: args.fallbackReason,
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

export const setSessionBirthChartDepth = mutation({
    args: {
        sessionId: v.id("oracle_sessions"),
        depth: v.union(v.literal("core"), v.literal("full")),
    },
    handler: async (ctx, { sessionId, depth }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        const session = await ctx.db.get(sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== userId) throw new Error("Unauthorized");
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

/**
 * Atomically quarantine a streamed response that failed the output scanner.
 * Keeping the message ID avoids a delete/insert race in the chat UI while the
 * original candidate remains available only in the admin-authorized turn trace.
 */
export const replaceStreamingMessageWithSafetyFallback = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        sessionId: v.id("oracle_sessions"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await ctx.db.get(args.messageId);
        if (!message || message.sessionId !== args.sessionId) {
            throw new Error("Streaming message not found for session");
        }

        await ctx.db.patch(args.messageId, {
            content: args.content,
            fallbackTierUsed: "D" as const,
            journalPrompt: undefined,
        });
        await ctx.db.patch(args.sessionId, {
            usedFallback: true,
            status: "active" as const,
            updatedAt: Date.now(),
        });
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
        // Debug timing metrics (stored on message for admin observability)
        timingPromptBuildMs: v.optional(v.number()),
        timingRequestQueueMs: v.optional(v.number()),
        timingTtftMs: v.optional(v.number()),
        timingInitialDecodeMs: v.optional(v.number()),
        timingTotalMs: v.optional(v.number()),
        debugModelUsed: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const {
            messageId,
            sessionId,
            content,
            modelUsed,
            promptTokens,
            completionTokens,
            fallbackTierUsed,
            systemPromptHash,
            journalPrompt,
            timingPromptBuildMs,
            timingRequestQueueMs,
            timingTtftMs,
            timingInitialDecodeMs,
            timingTotalMs,
            debugModelUsed,
        } = args;
        await ctx.db.patch(messageId, {
            content,
            modelUsed,
            promptTokens,
            completionTokens,
            fallbackTierUsed,
            systemPromptHash,
            ...(journalPrompt ? { journalPrompt } : {}),
            ...(timingPromptBuildMs !== undefined ? { timingPromptBuildMs } : {}),
            ...(timingRequestQueueMs !== undefined ? { timingRequestQueueMs } : {}),
            ...(timingTtftMs !== undefined ? { timingTtftMs } : {}),
            ...(timingInitialDecodeMs !== undefined ? { timingInitialDecodeMs } : {}),
            ...(timingTotalMs !== undefined ? { timingTotalMs } : {}),
            ...(debugModelUsed !== undefined ? { debugModelUsed } : {}),
        });
        await ctx.db.patch(sessionId, {
            ...(modelUsed ? { primaryModelUsed: modelUsed } : {}),
            ...(fallbackTierUsed && fallbackTierUsed !== "A"
                ? { usedFallback: true }
                : {}),
            status: "active" as const,
            updatedAt: Date.now(),
        });
    },
});

export const patchMessageTiming = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        modelUsed: v.optional(v.string()),
        fallbackTierUsed: v.optional(v.union(
            v.literal("A"),
            v.literal("B"),
            v.literal("C"),
            v.literal("D"),
        )),
        timingPromptBuildMs: v.optional(v.number()),
        timingRequestQueueMs: v.optional(v.number()),
        timingTtftMs: v.optional(v.number()),
        timingInitialDecodeMs: v.optional(v.number()),
        timingTotalMs: v.optional(v.number()),
        debugModelUsed: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { messageId, modelUsed, fallbackTierUsed, ...timing } = args;
        const patch: any = {};
        if (modelUsed !== undefined) patch.modelUsed = modelUsed;
        if (fallbackTierUsed !== undefined) patch.fallbackTierUsed = fallbackTierUsed;
        if (timing.timingPromptBuildMs !== undefined) patch.timingPromptBuildMs = timing.timingPromptBuildMs;
        if (timing.timingRequestQueueMs !== undefined) patch.timingRequestQueueMs = timing.timingRequestQueueMs;
        if (timing.timingTtftMs !== undefined) patch.timingTtftMs = timing.timingTtftMs;
        if (timing.timingInitialDecodeMs !== undefined) patch.timingInitialDecodeMs = timing.timingInitialDecodeMs;
        if (timing.timingTotalMs !== undefined) patch.timingTotalMs = timing.timingTotalMs;
        if (timing.debugModelUsed !== undefined) patch.debugModelUsed = timing.debugModelUsed;
        if (Object.keys(patch).length > 0) {
            await ctx.db.patch(messageId, patch);
        }
    },
});

/** Patch binaural beat params onto an assistant message (deterministic generation). */
export const patchMessageBinauralParams = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        binauralParams: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, { binauralParams: args.binauralParams });
    },
});

/** Delete an oracle message and decrement the session message count. Used for cleaning up refusal messages during tier retry. */
export const deleteMessage = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
    },
    handler: async (ctx, { messageId }) => {
        const msg = await ctx.db.get(messageId);
        if (!msg) return;

        // Decrement session message count
        const session = await ctx.db.get(msg.sessionId);
        if (session) {
            await ctx.db.patch(msg.sessionId, {
                messageCount: Math.max(0, session.messageCount - 1),
                updatedAt: Date.now(),
            });
        }

        await ctx.db.delete(messageId);
    },
});

/** Patch the cost (in microdollars) onto an oracle message after LLM response. */
export const patchMessageCost = internalMutation({
    args: {
        messageId: v.id("oracle_messages"),
        costUsdMicro: v.number(),
    },
    handler: async (ctx, { messageId, costUsdMicro }) => {
        await ctx.db.patch(messageId, { costUsdMicro });
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

/** Rate an assistant message (thumbs up/down). */
export const rateMessage = mutation({
    args: {
        messageId: v.id("oracle_messages"),
        rating: v.union(v.literal("positive"), v.literal("negative")),
    },
    handler: async (ctx, { messageId, rating }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        // Verify ownership via session
        const session = await ctx.db.get(message.sessionId);
        if (!session || session.userId !== userId) throw new Error("Unauthorized");

        // Only assistant messages can be rated
        if (message.role !== "assistant") throw new Error("Only assistant messages can be rated");

        await ctx.db.patch(messageId, { rating });
    },
});

/** Remove rating from a message (undo thumbs up/down). */
export const unrateMessage = mutation({
    args: {
        messageId: v.id("oracle_messages"),
    },
    handler: async (ctx, { messageId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        const session = await ctx.db.get(message.sessionId);
        if (!session || session.userId !== userId) throw new Error("Unauthorized");

        if (message.role !== "assistant") throw new Error("Only assistant messages can be rated");

        await ctx.db.patch(messageId, { rating: undefined });
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

/** Previous Oracle activity for deterministic "change since last visit" context. */
export const getPreviousOracleVisit = internalQuery({
    args: { userId: v.id("users"), currentSessionId: v.id("oracle_sessions") },
    handler: async (ctx, args) => {
        const sessions = await ctx.db.query("oracle_sessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(10);
        const previous = sessions.find((session) => session._id !== args.currentSessionId);
        return previous?.lastMessageAt ?? previous?.updatedAt ?? null;
    },
});
