import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import { Id } from "../_generated/dataModel";
import {
  parseProvidersConfig,
  parseModelChain,
  tierForIndex,
} from "../../lib/oracle/providers";

/**
 * Oracle Debug Queries — Admin-only transparent inspection layer.
 *
 * These queries provide a read-only window into the Oracle pipeline
 * so admins can visualize exactly what happens during a session,
 * from prompt assembly through LLM invocation to quota tracking.
 *
 * All queries require admin role (enforced via requireAdmin).
 */

// ── Debug Providers & Model Chain (for admin debug panel) ─────────────────

export const adminGetDebugProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const providerSetting = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "providers_config"))
      .first();

    const chainSetting = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "model_chain"))
      .first();

    const providers = parseProvidersConfig(providerSetting?.value);
    const modelChain = parseModelChain(chainSetting?.value);

    return {
      providers: providers.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        baseUrl: p.baseUrl,
      })),
      modelChain: modelChain.map((e, i) => ({
        ...e,
        tier: tierForIndex(i),
      })),
    };
  },
});

// ── Session List ──────────────────────────────────────────────────────────

export const adminListSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.min(args.limit ?? 100, 200);

    const sessions = await ctx.db
      .query("oracle_sessions")
      .order("desc")
      .take(limit);

    // Enrich with user info
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const user = await ctx.db.get(session.userId);
        return {
          ...session,
          userEmail: user?.email ?? "unknown",
          username: user?.username ?? "unknown",
          userRole: user?.role ?? "user",
          userTier: user?.tier ?? "free",
          hasBirthData: Boolean(user?.birthData),
        };
      }),
    );

    return enriched;
  },
});

// ── Session Detail (Full Inspector) ────────────────────────────────────────

export const adminGetSessionDetail = query({
  args: {
    sessionId: v.id("oracle_sessions"),
  },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);

    const session = await ctx.db.get(sessionId);
    if (!session) return null;

    const messages = await ctx.db
      .query("oracle_messages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();

    const user = await ctx.db.get(session.userId);

    // Quota info for this user
    const quotaUsage = await ctx.db
      .query("oracle_quota_usage")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Feature injections for this session's feature
    const featureInjections = session.featureKey
      ? await ctx.db
          .query("oracle_feature_injections")
          .withIndex("by_feature", (q) => q.eq("featureKey", session.featureKey!))
          .first()
      : null;

    // Also get depth-specific injections if birth_chart
    let depthInjection = null;
    if (session.featureKey === "birth_chart" && session.birthChartDepth) {
      depthInjection = await ctx.db
        .query("oracle_feature_injections")
        .withIndex("by_feature", (q) =>
          q.eq("featureKey", `birth_chart_depth_${session.birthChartDepth}`)
        )
        .first();
    }

    // All runtime settings
    const allSettings = await ctx.db.query("oracle_settings").collect();

    // Journal consent for this user
    let journalConsent = null;
    try {
      const consentDoc = await ctx.db
        .query("journal_consent")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .first();
      journalConsent = consentDoc
        ? {
            oracleCanReadJournal: consentDoc.oracleCanReadJournal ?? false,
            includeEntryContent: consentDoc.includeEntryContent ?? true,
            includeMoodData: consentDoc.includeMoodData ?? true,
            includeDreamData: consentDoc.includeDreamData ?? true,
            lookbackDays: consentDoc.lookbackDays ?? 30,
          }
        : null;
    } catch {
      journalConsent = null;
    }

    return {
      session,
      messages,
      user: user
        ? {
            _id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
            tier: user.tier,
            hasBirthData: Boolean(user.birthData),
            birthData: user.birthData ?? null,
          }
        : null,
      quotaUsage,
      featureInjections,
      depthInjection,
      allSettings,
      journalConsent,
    };
  },
});

// ── Quota Detail ───────────────────────────────────────────────────────────

export const adminGetQuotaDetail = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const plan =
      user.role === "admin" || user.role === "moderator"
        ? user.role
        : (user.tier as string);

    const limitKey = `quota_limit_${plan}`;
    const resetTypeKey = `quota_reset_${plan}`;

    const limitSetting = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", limitKey))
      .first();
    const resetTypeSetting = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", resetTypeKey))
      .first();

    const usage = await ctx.db
      .query("oracle_quota_usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        tier: user.tier,
      },
      plan,
      limit: limitSetting?.value ?? null,
      limitSettingExists: Boolean(limitSetting),
      resetType: resetTypeSetting?.value ?? null,
      usage: usage
        ? {
            dailyCount: usage.dailyCount,
            dailyWindowStart: usage.dailyWindowStart,
            lifetimeCount: usage.lifetimeCount,
            lastQuestionAt: usage.lastQuestionAt,
          }
        : null,
    };
  },
});

// ── All Feature Injections ─────────────────────────────────────────────────

export const adminListFeatureInjections = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("oracle_feature_injections").collect();
  },
});

// ── Oracle Stats (Overview) ────────────────────────────────────────────────

export const adminGetOracleStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const sessions = await ctx.db.query("oracle_sessions").collect();
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const completedSessions = sessions.filter((s) => s.status === "completed").length;
    const usedFallback = sessions.filter((s) => s.usedFallback).length;

    // Model usage distribution
    const modelCounts: Record<string, number> = {};
    for (const s of sessions) {
      const model = s.primaryModelUsed ?? "unknown";
      modelCounts[model] = (modelCounts[model] ?? 0) + 1;
    }

    // Feature usage distribution
    const featureCounts: Record<string, number> = {};
    for (const s of sessions) {
      const feature = s.featureKey ?? "none";
      featureCounts[feature] = (featureCounts[feature] ?? 0) + 1;
    }

    // Total messages
    const allMessages = await ctx.db.query("oracle_messages").collect();
    const totalMessages = allMessages.length;
    const userMessages = allMessages.filter((m) => m.role === "user").length;
    const assistantMessages = allMessages.filter((m) => m.role === "assistant").length;

    // Token usage
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let messagesWithTokens = 0;
    for (const m of allMessages) {
      if (m.promptTokens) {
        totalPromptTokens += m.promptTokens;
      }
      if (m.completionTokens) {
        totalCompletionTokens += m.completionTokens;
      }
      if (m.promptTokens || m.completionTokens) {
        messagesWithTokens++;
      }
    }

    // Tier distribution
    const tierCounts: Record<string, number> = {};
    for (const m of allMessages) {
      if (m.fallbackTierUsed) {
        tierCounts[m.fallbackTierUsed] = (tierCounts[m.fallbackTierUsed] ?? 0) + 1;
      }
    }

    // Crisis / kill-switch responses
    const crisisResponses = allMessages.filter(
      (m) => m.modelUsed === "crisis_response",
    ).length;
    const killSwitchResponses = allMessages.filter(
      (m) => m.modelUsed === "kill_switch",
    ).length;
    const fallbackResponses = allMessages.filter(
      (m) => m.modelUsed === "fallback_hardcoded" || m.fallbackTierUsed === "D",
    ).length;

    // Journal prompt suggestions
    const journalPrompts = allMessages.filter((m) => m.journalPrompt).length;

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      usedFallback,
      totalMessages,
      userMessages,
      assistantMessages,
      totalPromptTokens,
      totalCompletionTokens,
      messagesWithTokens,
      modelCounts,
      featureCounts,
      tierCounts,
      crisisResponses,
      killSwitchResponses,
      fallbackResponses,
      journalPrompts,
    };
  },
});