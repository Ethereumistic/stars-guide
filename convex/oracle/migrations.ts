import { internalMutation } from "../_generated/server";
import {
  DEFAULT_SOUL_DOCS,
  DEFAULT_TOKEN_LIMITS,
  SOUL_DOC_DEFINITIONS,
  SOUL_DOC_KEYS,
  TOKEN_LIMIT_DEFINITIONS,
  TOKEN_LIMIT_KEYS,
} from "../../lib/oracle/soul";
import {
  DEFAULT_PROVIDERS,
  DEFAULT_MODEL_CHAIN,
} from "../../lib/oracle/providers";

export const migrateOracleSettingsV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const legacySoulPrompt = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "soul_prompt"))
      .first();

    if (legacySoulPrompt) {
      const existingBackup = await ctx.db
        .query("oracle_prompt_versions")
        .withIndex("by_entity", (q) => q.eq("entityType", "soul_prompt").eq("entityId", "soul_prompt"))
        .first();

      if (!existingBackup) {
        await ctx.db.insert("oracle_prompt_versions", {
          entityType: "soul_prompt",
          entityId: "soul_prompt",
          content: legacySoulPrompt.value,
          version: 1,
          savedAt: now,
          label: "pre-v2-migration",
        });
      }

      await ctx.db.delete(legacySoulPrompt._id);
    }

    for (const key of SOUL_DOC_KEYS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      const payload = {
        key,
        value: DEFAULT_SOUL_DOCS[key],
        valueType: "string" as const,
        label: SOUL_DOC_DEFINITIONS[key].label,
        description: SOUL_DOC_DEFINITIONS[key].description,
        group: "soul",
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("oracle_settings", payload);
      }
    }

    const legacyMaxTokens = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "max_tokens"))
      .first();

    if (legacyMaxTokens) {
      await ctx.db.delete(legacyMaxTokens._id);
    }

    for (const key of TOKEN_LIMIT_KEYS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      const payload = {
        key,
        value: String(DEFAULT_TOKEN_LIMITS[key]),
        valueType: "number" as const,
        label: TOKEN_LIMIT_DEFINITIONS[key].label,
        description: TOKEN_LIMIT_DEFINITIONS[key].description,
        group: "token_limits",
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("oracle_settings", payload);
      }
    }

    return {
      status: "ok",
      migratedSoulPrompt: Boolean(legacySoulPrompt),
      migratedMaxTokens: Boolean(legacyMaxTokens),
    };
  },
});

/**
 * V3 Migration: Add multi-provider support.
 * Creates providers_config and model_chain settings if they don't exist.
 * Builds model_chain from existing model_a/b/c if those are set.
 */
export const migrateOracleSettingsV3 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if providers_config already exists
    const existingProviders = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "providers_config"))
      .first();

    if (!existingProviders) {
      await ctx.db.insert("oracle_settings", {
        key: "providers_config",
        value: JSON.stringify(DEFAULT_PROVIDERS),
        valueType: "json",
        label: "Provider Configuration",
        description: "JSON array of AI providers",
        group: "provider",
        updatedAt: now,
      });
    }

    // Check if model_chain already exists
    const existingChain = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "model_chain"))
      .first();

    if (!existingChain) {
      // Build chain from existing model_a/b/c if available
      const modelA = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", "model_a"))
        .first();
      const modelB = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", "model_b"))
        .first();
      const modelC = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", "model_c"))
        .first();

      const chain: Array<{ providerId: string; model: string }> = [];

      if (modelA && modelA.value !== "NONE") {
        chain.push({ providerId: "openrouter", model: modelA.value });
      }
      if (modelB && modelB.value !== "NONE") {
        chain.push({ providerId: "openrouter", model: modelB.value });
      }
      if (modelC && modelC.value !== "NONE") {
        chain.push({ providerId: "openrouter", model: modelC.value });
      }

      const chainValue = chain.length > 0 ? JSON.stringify(chain) : JSON.stringify(DEFAULT_MODEL_CHAIN);

      await ctx.db.insert("oracle_settings", {
        key: "model_chain",
        value: chainValue,
        valueType: "json",
        label: "Model Fallback Chain",
        description: "Ordered list of provider+model pairs Oracle tries sequentially",
        group: "model",
        updatedAt: now,
      });
    }

    return {
      status: "ok",
      createdProviders: !existingProviders,
      createdModelChain: !existingChain,
    };
  },
});
