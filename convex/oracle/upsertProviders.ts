import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import {
  parseProvidersConfig,
  parseModelChain,
  validateProvidersConfig,
  validateModelChain,
} from "../../lib/oracle/providers";

export const upsertProvidersConfig = mutation({
  args: {
    providersConfig: v.string(), // JSON string of ProviderConfig[]
    modelChain: v.string(),      // JSON string of ModelChainEntry[]
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const parsedProviders = parseProvidersConfig(args.providersConfig);
    const parsedChain = parseModelChain(args.modelChain);

    const providerErrors = validateProvidersConfig(parsedProviders);
    if (providerErrors.length > 0) {
      throw new Error(`Provider validation failed: ${providerErrors.join(" ")}`);
    }

    const chainErrors = validateModelChain(parsedChain, parsedProviders);
    if (chainErrors.length > 0) {
      throw new Error(`Model chain validation failed: ${chainErrors.join(" ")}`);
    }

    const now = Date.now();
    for (const provider of parsedProviders) {
      const existingProvider = await ctx.db
        .query("ai_providers")
        .withIndex("by_provider_id", (q) => q.eq("providerId", provider.id))
        .first();
      const row = {
        providerId: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKeyEnvVar: provider.apiKeyEnvVar,
        maxConcurrent: provider.maxConcurrent,
        enabled: true,
        updatedAt: now,
        updatedBy: userId,
      };
      if (existingProvider) {
        await ctx.db.patch(existingProvider._id, row);
      } else {
        await ctx.db.insert("ai_providers", { ...row, createdAt: now });
      }
    }

    const existingProfile = await ctx.db
      .query("ai_feature_profiles")
      .withIndex("by_feature_key", (q) => q.eq("featureKey", "oracle_chat"))
      .first();
    const profile = {
      featureKey: "oracle_chat",
      label: "Oracle Chat",
      enabled: true,
      mode: "stream" as const,
      chainJson: JSON.stringify(parsedChain),
      temperature: 0.82,
      maxTokens: 1200,
      timeoutMs: 120000,
      thinkingMode: "auto" as const,
      retries: 1,
      safetyProfile: "oracle" as const,
      quotaScope: "oracle_user" as const,
      updatedAt: now,
      updatedBy: userId,
    };
    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profile);
    } else {
      await ctx.db.insert("ai_feature_profiles", { ...profile, createdAt: now });
    }

    return { ok: true };
  },
});
