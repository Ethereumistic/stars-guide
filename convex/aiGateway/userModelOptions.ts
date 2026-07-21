import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import {
  minimumRequiredTier,
  resolveUserModelPolicy,
  type ModelChainEntry,
  type ReasoningEffort,
  type UserTier,
} from "../../src/lib/ai/inference-preferences";

const userTier = v.union(
  v.literal("free"),
  v.literal("popular"),
  v.literal("premium"),
);

const reasoningEffort = v.union(
  v.literal("auto"),
  v.literal("disabled"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const chainEntry = v.object({ providerId: v.string(), model: v.string() });

const modelOptionInput = v.object({
  optionKey: v.string(),
  label: v.string(),
  description: v.optional(v.string()),
  badge: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  enabled: v.boolean(),
  showWhenLocked: v.boolean(),
  allowedTiers: v.array(userTier),
  defaultForTiers: v.array(userTier),
  chain: v.array(chainEntry),
  allowedReasoningEfforts: v.array(reasoningEffort),
  defaultReasoningEffort: reasoningEffort,
  usageHint: v.optional(v.string()),
  sortOrder: v.number(),
});

type ModelOptionInput = {
  optionKey: string;
  label: string;
  description?: string;
  badge?: string;
  logoUrl?: string;
  enabled: boolean;
  showWhenLocked: boolean;
  allowedTiers: UserTier[];
  defaultForTiers: UserTier[];
  chain: ModelChainEntry[];
  allowedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  usageHint?: string;
  sortOrder: number;
};

function effectiveTier(user: { role?: string; tier?: string }): UserTier {
  if (user.role === "admin" || user.role === "moderator") return "premium";
  if (user.tier === "popular" || user.tier === "premium") return user.tier;
  return "free";
}

function parseProfileChain(raw: string): ModelChainEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ModelChainEntry =>
        Boolean(
          entry &&
          typeof entry === "object" &&
          typeof entry.providerId === "string" &&
          entry.providerId.trim() &&
          typeof entry.model === "string" &&
          entry.model.trim(),
        ),
    );
  } catch {
    return [];
  }
}

function cleanOptional(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function normalizeOption(option: ModelOptionInput, index: number): ModelOptionInput {
  return {
    ...option,
    optionKey: option.optionKey.trim(),
    label: option.label.trim(),
    description: cleanOptional(option.description),
    badge: cleanOptional(option.badge),
    logoUrl: cleanOptional(option.logoUrl),
    usageHint: cleanOptional(option.usageHint),
    allowedTiers: [...new Set(option.allowedTiers)],
    defaultForTiers: [...new Set(option.defaultForTiers)],
    allowedReasoningEfforts: [...new Set(option.allowedReasoningEfforts)],
    chain: option.chain.map((entry) => ({
      providerId: entry.providerId.trim(),
      model: entry.model.trim(),
    })),
    sortOrder: Number.isFinite(option.sortOrder) ? option.sortOrder : index,
  };
}

function validateOptions(
  options: ModelOptionInput[],
  providerIds: Set<string>,
  requireDefaults: boolean,
): void {
  const seenKeys = new Set<string>();
  for (const option of options) {
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(option.optionKey)) {
      throw new ConvexError({
        field: "optionKey",
        optionKey: option.optionKey,
        message: "Use 2–64 lowercase letters, numbers, hyphens, or underscores.",
      });
    }
    if (seenKeys.has(option.optionKey)) {
      throw new ConvexError({ field: "optionKey", optionKey: option.optionKey, message: "Option keys must be unique." });
    }
    seenKeys.add(option.optionKey);
    if (!option.label) {
      throw new ConvexError({ field: "label", optionKey: option.optionKey, message: "Every option needs a label." });
    }
    if (option.logoUrl) {
      let parsedLogoUrl: URL;
      try {
        parsedLogoUrl = new URL(option.logoUrl);
      } catch {
        throw new ConvexError({ field: "logoUrl", optionKey: option.optionKey, message: "Logo URL must be a valid HTTPS URL." });
      }
      if (
        parsedLogoUrl.protocol !== "https:"
        || parsedLogoUrl.username
        || parsedLogoUrl.password
        || option.logoUrl.length > 2048
      ) {
        throw new ConvexError({ field: "logoUrl", optionKey: option.optionKey, message: "Logo URL must be a public HTTPS URL under 2,048 characters." });
      }
    }
    if (!option.enabled) continue;
    if (option.allowedTiers.length === 0) {
      throw new ConvexError({ field: "allowedTiers", optionKey: option.optionKey, message: "Choose at least one plan." });
    }
    if (option.chain.length === 0) {
      throw new ConvexError({ field: "chain", optionKey: option.optionKey, message: "Add at least one model route." });
    }
    const duplicateRows = new Set<string>();
    for (const entry of option.chain) {
      if (!entry.providerId || !entry.model) {
        throw new ConvexError({ field: "chain", optionKey: option.optionKey, message: "Provider and model are required for every route." });
      }
      if (!providerIds.has(entry.providerId)) {
        throw new ConvexError({ field: "chain", optionKey: option.optionKey, message: `Provider \"${entry.providerId}\" does not exist.` });
      }
      const rowKey = `${entry.providerId}/${entry.model}`;
      if (duplicateRows.has(rowKey)) {
        throw new ConvexError({ field: "chain", optionKey: option.optionKey, message: `Duplicate route ${rowKey}.` });
      }
      duplicateRows.add(rowKey);
    }
    if (option.allowedReasoningEfforts.length === 0) {
      throw new ConvexError({ field: "allowedReasoningEfforts", optionKey: option.optionKey, message: "Choose at least one reasoning effort." });
    }
    if (!option.allowedReasoningEfforts.includes(option.defaultReasoningEffort)) {
      throw new ConvexError({ field: "defaultReasoningEffort", optionKey: option.optionKey, message: "Default effort must be one of the allowed efforts." });
    }
    for (const tier of option.defaultForTiers) {
      if (!option.allowedTiers.includes(tier)) {
        throw new ConvexError({ field: "defaultForTiers", optionKey: option.optionKey, message: `${tier} cannot default to an option it cannot use.` });
      }
    }
  }

  if (!requireDefaults) return;
  for (const tier of ["free", "popular", "premium"] as const) {
    const defaults = options.filter(
      (option) => option.enabled && option.allowedTiers.includes(tier) && option.defaultForTiers.includes(tier),
    );
    if (defaults.length !== 1) {
      throw new ConvexError({
        field: "defaultForTiers",
        tier,
        message: `Exactly one enabled default is required for ${tier}.`,
      });
    }
  }
}

async function getProfile(ctx: any, featureKey: string) {
  return await ctx.db
    .query("ai_feature_profiles")
    .withIndex("by_feature_key", (q: any) => q.eq("featureKey", featureKey))
    .first();
}

async function getOptions(ctx: any, featureKey: string) {
  return await ctx.db
    .query("ai_user_model_options")
    .withIndex("by_feature_order", (q: any) => q.eq("featureKey", featureKey))
    .collect();
}

export const getComposerCapabilities = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const tier = effectiveTier(user);
    const profile = await getProfile(ctx, "oracle_chat");
    const enabled = Boolean(profile?.enabled && profile.allowUserModelSelection);
    if (!enabled) {
      return {
        enabled: false,
        effectiveTier: tier,
        defaultOptionKey: "automatic",
        options: [{
          optionKey: "automatic",
          label: "Automatic",
          description: "Oracle chooses the best available model.",
          badge: "Default",
          available: true,
          allowedReasoningEfforts: [profile?.thinkingMode ?? "auto"],
          defaultReasoningEffort: profile?.thinkingMode ?? "auto",
        }],
      };
    }

    const options = (await getOptions(ctx, "oracle_chat"))
      .filter((option: any) => option.enabled && (option.allowedTiers.includes(tier) || option.showWhenLocked));
    const defaultOption = options.find(
      (option: any) => option.allowedTiers.includes(tier) && option.defaultForTiers.includes(tier),
    ) ?? options.find((option: any) => option.allowedTiers.includes(tier));

    return {
      enabled: true,
      effectiveTier: tier,
      defaultOptionKey: defaultOption?.optionKey ?? "automatic",
      options: options.map((option: any) => ({
        optionKey: option.optionKey,
        label: option.label,
        description: option.description,
        badge: option.badge,
        logoUrl: option.logoUrl,
        available: option.allowedTiers.includes(tier),
        requiredTier: option.allowedTiers.includes(tier)
          ? undefined
          : minimumRequiredTier(option.allowedTiers as UserTier[]),
        allowedReasoningEfforts: option.allowedReasoningEfforts,
        defaultReasoningEffort: option.defaultReasoningEffort,
        usageHint: option.usageHint,
      })),
    };
  },
});

export async function resolveOracleRouteForUser(
  ctx: any,
  user: { role?: string; tier?: string },
  requestedOptionKey?: string,
  requestedReasoningEffort?: ReasoningEffort,
) {
  const profile = await getProfile(ctx, "oracle_chat");
  const tier = effectiveTier(user);
  if (!profile?.enabled) {
    return {
      source: "feature_default" as const,
      optionKey: undefined,
      chain: [] as ModelChainEntry[],
      reasoningEffort: "auto" as const,
      effectiveTier: tier,
      fallbackReason: "profile_unavailable",
    };
  }
  const profileChain = parseProfileChain(profile.chainJson);
  const featureFallback = (reason?: string) => ({
    source: "feature_default" as const,
    optionKey: undefined,
    chain: profileChain,
    reasoningEffort: profile.thinkingMode as ReasoningEffort,
    effectiveTier: tier,
    fallbackReason: reason,
  });

  if (!profile.allowUserModelSelection) return featureFallback("selection_disabled");
  const [configuredOptions, providers] = await Promise.all([
    getOptions(ctx, "oracle_chat") as Promise<ModelOptionInput[]>,
    ctx.db.query("ai_providers").collect(),
  ]);
  const enabledProviderIds = new Set(
    providers.filter((provider: any) => provider.enabled).map((provider: any) => provider.providerId),
  );
  const options = configuredOptions.map((option) => ({
    ...option,
    chain: option.chain.filter((entry) => enabledProviderIds.has(entry.providerId)),
  }));
  const resolution = resolveUserModelPolicy(
    options,
    tier,
    requestedOptionKey,
    requestedReasoningEffort,
  );
  if (!resolution.option?.chain?.length) {
    return featureFallback(resolution.option ? "provider_unavailable" : resolution.fallbackReason ?? "no_tier_default");
  }

  return {
    source: "user_option" as const,
    optionKey: resolution.option.optionKey,
    chain: resolution.option.chain,
    reasoningEffort: resolution.reasoningEffort,
    effectiveTier: tier,
    fallbackReason: resolution.fallbackReason,
  };
}

export const resolveOracleRouteInternal = internalQuery({
  args: {
    requestedOptionKey: v.optional(v.string()),
    requestedReasoningEffort: v.optional(reasoningEffort),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    return await resolveOracleRouteForUser(
      ctx,
      user,
      args.requestedOptionKey,
      args.requestedReasoningEffort,
    );
  },
});

export const listUserModelOptions = query({
  args: { featureKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const featureKey = args.featureKey ?? "oracle_chat";
    const [profile, options] = await Promise.all([
      getProfile(ctx, featureKey),
      getOptions(ctx, featureKey),
    ]);
    return {
      allowUserModelSelection: profile?.allowUserModelSelection ?? false,
      options,
    };
  },
});

export const saveUserModelOptions = mutation({
  args: {
    featureKey: v.string(),
    options: v.array(modelOptionInput),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const profile = await getProfile(ctx, args.featureKey);
    if (!profile) throw new ConvexError({ message: `Feature profile \"${args.featureKey}\" does not exist.` });
    const providers = await ctx.db.query("ai_providers").collect();
    const normalized = args.options.map(normalizeOption).sort((a, b) => a.sortOrder - b.sortOrder);
    validateOptions(normalized, new Set(providers.map((provider) => provider.providerId)), Boolean(profile.allowUserModelSelection));

    const existing = await getOptions(ctx, args.featureKey);
    const existingByKey = new Map(existing.map((option: any) => [option.optionKey, option]));
    const nextKeys = new Set(normalized.map((option) => option.optionKey));
    const now = Date.now();
    for (let index = 0; index < normalized.length; index++) {
      const option = { ...normalized[index], sortOrder: index, featureKey: args.featureKey, updatedAt: now, updatedBy: userId };
      const row = existingByKey.get(option.optionKey) as any;
      if (row) await ctx.db.patch(row._id, option);
      else await ctx.db.insert("ai_user_model_options", { ...option, createdAt: now });
    }
    for (const option of existing) {
      if (!nextKeys.has(option.optionKey)) await ctx.db.delete(option._id);
    }
    return { saved: normalized.length };
  },
});

export const setUserModelSelectionEnabled = mutation({
  args: { featureKey: v.string(), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const profile = await getProfile(ctx, args.featureKey);
    if (!profile) throw new ConvexError({ message: `Feature profile \"${args.featureKey}\" does not exist.` });
    if (args.enabled) {
      const [providers, options] = await Promise.all([
        ctx.db.query("ai_providers").collect(),
        getOptions(ctx, args.featureKey),
      ]);
      validateOptions(
        options.map((option: any, index: number) => normalizeOption(option, index)),
        new Set(providers.map((provider) => provider.providerId)),
        true,
      );
    }
    await ctx.db.patch(profile._id, {
      allowUserModelSelection: args.enabled,
      updatedAt: Date.now(),
      updatedBy: userId,
    });
    return args.enabled;
  },
});

export const seedFromOracleProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAdmin(ctx);
    const profile = await getProfile(ctx, "oracle_chat");
    if (!profile) throw new ConvexError({ message: "Oracle chat profile is not configured." });
    const existing = await getOptions(ctx, "oracle_chat");
    if (existing.length > 0) return { seeded: false, reason: "options_exist" };
    const chain = parseProfileChain(profile.chainJson);
    if (chain.length === 0) throw new ConvexError({ message: "Oracle chat profile has no valid model chain." });
    const now = Date.now();
    await ctx.db.insert("ai_user_model_options", {
      featureKey: "oracle_chat",
      optionKey: "automatic",
      label: "Automatic",
      description: "Oracle chooses the best available model.",
      badge: "Default",
      enabled: true,
      showWhenLocked: true,
      allowedTiers: ["free", "popular", "premium"],
      defaultForTiers: ["free", "popular", "premium"],
      chain,
      allowedReasoningEfforts: [profile.thinkingMode],
      defaultReasoningEffort: profile.thinkingMode,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
    });
    await ctx.db.patch(profile._id, { allowUserModelSelection: false, updatedAt: now, updatedBy: userId });
    return { seeded: true };
  },
});
