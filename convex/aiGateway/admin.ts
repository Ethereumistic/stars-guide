import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import {
  DEFAULT_INTENT_MODEL_CHAIN,
  DEFAULT_MODEL_CHAIN,
  parseModelChain,
  parseProvidersConfig,
} from "../../lib/oracle/providers";

const providerType = v.union(
  v.literal("openrouter"),
  v.literal("ollama"),
  v.literal("openai_compatible"),
);

const aiMode = v.union(
  v.literal("chat"),
  v.literal("json"),
  v.literal("stream"),
  v.literal("embedding"),
  v.literal("image"),
);

const thinkingMode = v.union(
  v.literal("auto"),
  v.literal("disabled"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const safetyProfile = v.union(
  v.literal("oracle"),
  v.literal("content_generation"),
  v.literal("none"),
);

const quotaScope = v.union(
  v.literal("oracle_user"),
  v.literal("admin_ops"),
  v.literal("none"),
);

const featureProfileDefaults = [
  {
    featureKey: "oracle_chat",
    label: "Oracle Chat",
    mode: "stream",
    chain: DEFAULT_MODEL_CHAIN,
    temperature: 0.82,
    maxTokens: 1200,
    timeoutMs: 120000,
    thinkingMode: "auto",
    retries: 1,
    safetyProfile: "oracle",
    quotaScope: "oracle_user",
  },
  {
    featureKey: "oracle_intent",
    label: "Oracle Intent",
    mode: "json",
    chain: DEFAULT_INTENT_MODEL_CHAIN,
    temperature: 0.1,
    maxTokens: 300,
    timeoutMs: 45000,
    thinkingMode: "disabled",
    retries: 1,
    safetyProfile: "oracle",
    quotaScope: "oracle_user",
  },
  {
    featureKey: "birth_chart_report",
    label: "Birth Chart Report",
    mode: "json",
    chain: DEFAULT_MODEL_CHAIN,
    temperature: 0.6,
    maxTokens: 6000,
    timeoutMs: 180000,
    thinkingMode: "low",
    retries: 1,
    safetyProfile: "oracle",
    quotaScope: "oracle_user",
  },
  {
    featureKey: "horoscope_generation",
    label: "Horoscope Generation",
    mode: "json",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash" }],
    temperature: 0.75,
    maxTokens: 4096,
    timeoutMs: 120000,
    thinkingMode: "disabled",
    retries: 1,
    safetyProfile: "content_generation",
    quotaScope: "admin_ops",
  },
  {
    featureKey: "cosmic_weather_felt_language",
    label: "Cosmic Weather Felt Language",
    mode: "chat",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash-lite" }],
    temperature: 0.4,
    maxTokens: 300,
    timeoutMs: 60000,
    thinkingMode: "disabled",
    retries: 1,
    safetyProfile: "content_generation",
    quotaScope: "admin_ops",
  },
  {
    featureKey: "zeitgeist_synthesis",
    label: "Zeitgeist Synthesis",
    mode: "chat",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash" }],
    temperature: 0.6,
    maxTokens: 300,
    timeoutMs: 60000,
    thinkingMode: "auto",
    retries: 1,
    safetyProfile: "content_generation",
    quotaScope: "admin_ops",
  },
  {
    featureKey: "emotional_translation",
    label: "Emotional Translation",
    mode: "chat",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash" }],
    temperature: 0.65,
    maxTokens: 400,
    timeoutMs: 60000,
    thinkingMode: "auto",
    retries: 1,
    safetyProfile: "content_generation",
    quotaScope: "admin_ops",
  },
  {
    featureKey: "emotional_register_classification",
    label: "Emotional Register Classification",
    mode: "json",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash" }],
    temperature: 0.3,
    maxTokens: 100,
    timeoutMs: 45000,
    thinkingMode: "disabled",
    retries: 1,
    safetyProfile: "content_generation",
    quotaScope: "admin_ops",
  },
  {
    featureKey: "ai_admin_test",
    label: "AI Admin Test",
    mode: "chat",
    chain: [{ providerId: "openrouter", model: "google/gemini-2.5-flash" }],
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 120000,
    thinkingMode: "auto",
    retries: 0,
    safetyProfile: "none",
    quotaScope: "admin_ops",
  },
] as const;

export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("ai_providers").collect();
  },
});

export const listFeatureProfiles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("ai_feature_profiles").collect();
  },
});

export const upsertProvider = mutation({
  args: {
    providerId: v.string(),
    name: v.string(),
    type: providerType,
    baseUrl: v.string(),
    apiKeyEnvVar: v.string(),
    maxConcurrent: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("ai_providers")
      .withIndex("by_provider_id", (q) => q.eq("providerId", args.providerId))
      .first();

    const patch = {
      name: args.name,
      type: args.type,
      baseUrl: args.baseUrl,
      apiKeyEnvVar: args.apiKeyEnvVar,
      maxConcurrent: args.maxConcurrent,
      enabled: args.enabled ?? true,
      updatedAt: now,
      updatedBy: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("ai_providers", {
      providerId: args.providerId,
      ...patch,
      createdAt: now,
    });
  },
});

export const disableProvider = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const provider = await ctx.db
      .query("ai_providers")
      .withIndex("by_provider_id", (q) => q.eq("providerId", args.providerId))
      .first();
    if (!provider) return null;
    await ctx.db.patch(provider._id, { enabled: false, updatedAt: Date.now() });
    return provider._id;
  },
});

export const upsertFeatureProfile = mutation({
  args: {
    featureKey: v.string(),
    label: v.string(),
    enabled: v.boolean(),
    mode: aiMode,
    chainJson: v.string(),
    temperature: v.number(),
    topP: v.optional(v.number()),
    maxTokens: v.number(),
    timeoutMs: v.number(),
    thinkingMode,
    retries: v.number(),
    safetyProfile: v.optional(safetyProfile),
    quotaScope: v.optional(quotaScope),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    JSON.parse(args.chainJson);
    const now = Date.now();
    const existing = await ctx.db
      .query("ai_feature_profiles")
      .withIndex("by_feature_key", (q) => q.eq("featureKey", args.featureKey))
      .first();

    const patch = { ...args, updatedAt: now, updatedBy: userId };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("ai_feature_profiles", {
      ...patch,
      createdAt: now,
    });
  },
});

export const seedFromLegacyOracleSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();
    const settings = await ctx.db.query("oracle_settings").collect();
    const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const providers = parseProvidersConfig(settingMap.providers_config);

    let providersSeeded = 0;
    for (const provider of providers) {
      const existing = await ctx.db
        .query("ai_providers")
        .withIndex("by_provider_id", (q) => q.eq("providerId", provider.id))
        .first();
      const row = {
        providerId: provider.id,
        name: provider.name,
        type: provider.type as "openrouter" | "ollama" | "openai_compatible",
        baseUrl: provider.baseUrl,
        apiKeyEnvVar: provider.apiKeyEnvVar,
        maxConcurrent: provider.maxConcurrent,
        enabled: true,
        updatedAt: now,
        updatedBy: userId,
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("ai_providers", { ...row, createdAt: now });
      }
      providersSeeded++;
    }

    const horoscopeChain =
      settingMap.horoscope_provider && settingMap.horoscope_model
        ? [{ providerId: settingMap.horoscope_provider, model: settingMap.horoscope_model }]
        : undefined;

    let profilesSeeded = 0;
    for (const profile of featureProfileDefaults) {
      const chain =
        profile.featureKey === "oracle_chat"
          ? parseModelChain(settingMap.model_chain)
          : profile.featureKey === "oracle_intent"
            ? parseModelChain(settingMap.intent_model_chain)
            : profile.featureKey === "birth_chart_report"
              ? parseModelChain(settingMap.birth_chart_report_model_chain)
              : profile.featureKey === "horoscope_generation" && horoscopeChain
                ? horoscopeChain
                : profile.chain;

      const existing = await ctx.db
        .query("ai_feature_profiles")
        .withIndex("by_feature_key", (q) => q.eq("featureKey", profile.featureKey))
        .first();
      const row = {
        featureKey: profile.featureKey,
        label: profile.label,
        enabled: true,
        mode: profile.mode,
        chainJson: JSON.stringify(chain),
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        timeoutMs: profile.timeoutMs,
        thinkingMode: profile.thinkingMode,
        retries: profile.retries,
        safetyProfile: profile.safetyProfile,
        quotaScope: profile.quotaScope,
        updatedAt: now,
        updatedBy: userId,
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("ai_feature_profiles", { ...row, createdAt: now });
      }
      profilesSeeded++;
    }

    return { providersSeeded, profilesSeeded };
  },
});

export const listEnabledProvidersInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ai_providers")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

export const getFeatureProfileInternal = internalQuery({
  args: { featureKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ai_feature_profiles")
      .withIndex("by_feature_key", (q) => q.eq("featureKey", args.featureKey))
      .first();
  },
});

export const logGatewayEventInternal = internalMutation({
  args: {
    featureKey: v.string(),
    mode: v.string(),
    providerId: v.optional(v.string()),
    model: v.optional(v.string()),
    tier: v.optional(v.string()),
    status: v.union(v.literal("success"), v.literal("failure"), v.literal("blocked")),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    costMicro: v.optional(v.number()),
    routeKey: v.optional(v.string()),
    requestedThinkingMode: v.optional(v.string()),
    effectiveUserTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ai_gateway_events", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getProviderHealthInternal = internalQuery({
  args: { featureKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ai_provider_health")
      .withIndex("by_feature_status", (q) => q.eq("featureKey", args.featureKey))
      .collect();
  },
});

export const recordProviderHealthInternal = internalMutation({
  args: {
    featureKey: v.string(),
    providerId: v.string(),
    model: v.string(),
    success: v.boolean(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("ai_provider_health")
      .withIndex("by_provider_model_feature", (q) =>
        q
          .eq("providerId", args.providerId)
          .eq("model", args.model)
          .eq("featureKey", args.featureKey),
      )
      .first();

    const consecutiveFailures = args.success ? 0 : (existing?.consecutiveFailures ?? 0) + 1;
    const cooldownUntil = !args.success && consecutiveFailures >= 3
      ? now + Math.min(15 * 60_000, consecutiveFailures * 60_000)
      : undefined;
    const status = args.success
      ? "healthy"
      : cooldownUntil && cooldownUntil > now
        ? "cooldown"
        : "degraded";

    const patch = {
      status: status as "healthy" | "degraded" | "cooldown",
      successCount: (existing?.successCount ?? 0) + (args.success ? 1 : 0),
      failureCount: (existing?.failureCount ?? 0) + (args.success ? 0 : 1),
      consecutiveFailures,
      lastSuccessAt: args.success ? now : existing?.lastSuccessAt,
      lastFailureAt: args.success ? existing?.lastFailureAt : now,
      cooldownUntil,
      lastErrorType: args.success ? undefined : args.errorType,
      lastErrorMessage: args.success ? undefined : args.errorMessage?.slice(0, 2000),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("ai_provider_health", {
      providerId: args.providerId,
      model: args.model,
      featureKey: args.featureKey,
      ...patch,
    });
  },
});
