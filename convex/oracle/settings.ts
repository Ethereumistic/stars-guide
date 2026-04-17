import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import {
  buildSoulDocRecord,
  buildTokenLimitRecord,
} from "../../lib/oracle/soul";
import {
  parseProvidersConfig,
  parseModelChain,
  parseTitleChain,
  type ProviderConfig,
  type ModelChainEntry,
} from "../../lib/oracle/providers";

function toSettingsMap(
  settings: Array<{ key: string; value: string }>,
): Record<string, string> {
  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
}

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

export const getSettingsByGroup = query({
  args: { group: v.string() },
  handler: async (ctx, { group }) => {
    return await ctx.db
      .query("oracle_settings")
      .withIndex("by_group", (q) => q.eq("group", group))
      .collect();
  },
});

export const getPromptRuntimeSettings = query({
  args: {},
  handler: async (ctx) => {
    const [soulSettings, modelSettings, tokenLimitSettings, providerSettings] = await Promise.all([
      ctx.db
        .query("oracle_settings")
        .withIndex("by_group", (q) => q.eq("group", "soul"))
        .collect(),
      ctx.db
        .query("oracle_settings")
        .withIndex("by_group", (q) => q.eq("group", "model"))
        .collect(),
      ctx.db
        .query("oracle_settings")
        .withIndex("by_group", (q) => q.eq("group", "token_limits"))
        .collect(),
      ctx.db
        .query("oracle_settings")
        .withIndex("by_group", (q) => q.eq("group", "provider"))
        .collect(),
    ]);

    const soulMap = toSettingsMap(soulSettings);
    const modelMap = toSettingsMap(modelSettings);
    const tokenLimitMap = toSettingsMap(tokenLimitSettings);
    const providerMap = toSettingsMap(providerSettings);

    // Model chain: prefer new JSON-based chain, fall back to old model_a/b/c
    const modelChain = parseModelChain(modelMap.model_chain);
    const titleChain = parseTitleChain(modelMap.title_generation_chain);
    const providers = parseProvidersConfig(providerMap.providers_config);

    // DEPRECATED FALLBACK: If model_chain is just defaults but legacy model_a/b/c have been customized,
    // build chain from legacy settings. This is kept for backward compatibility but the admin UI 
    // now exclusively writes to model_chain and providers_config.
    const hasCustomLegacyModels =
      modelMap.model_a || modelMap.model_b || modelMap.model_c;

    const effectiveModelChain =
      modelMap.model_chain
        ? modelChain
        : hasCustomLegacyModels
          ? [
              ...(modelMap.model_a && modelMap.model_a !== "NONE"
                ? [{ providerId: providers[0]?.id ?? "openrouter", model: modelMap.model_a }]
                : []),
              ...(modelMap.model_b && modelMap.model_b !== "NONE"
                ? [{ providerId: providers[0]?.id ?? "openrouter", model: modelMap.model_b }]
                : []),
              ...(modelMap.model_c && modelMap.model_c !== "NONE"
                ? [{ providerId: providers[0]?.id ?? "openrouter", model: modelMap.model_c }]
                : []),
            ]
          : modelChain;

    return {
      soulDocs: buildSoulDocRecord(soulMap),
      tokenLimits: buildTokenLimitRecord(tokenLimitMap),
      modelSettings: {
        modelA: modelMap.model_a ?? "google/gemini-2.5-flash",
        modelB: modelMap.model_b ?? "anthropic/claude-sonnet-4",
        modelC: modelMap.model_c ?? "x-ai/grok-4.1-fast",
        temperature: Number.parseFloat(modelMap.temperature ?? "0.82"),
        topP: Number.parseFloat(modelMap.top_p ?? "0.92"),
        streamEnabled: modelMap.stream_enabled !== "false",
      },
      providers,
      modelChain: effectiveModelChain,
      titleChain,
    };
  },
});

export const listAllSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("oracle_settings").collect();
  },
});

export const upsertSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    valueType: v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("json"),
    ),
    label: v.string(),
    description: v.optional(v.string()),
    group: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    if (args.valueType === "number" && Number.isNaN(Number(args.value))) {
      throw new Error(`Value "${args.value}" is not a valid number`);
    }

    if (args.valueType === "boolean" && !["true", "false"].includes(args.value)) {
      throw new Error(`Value "${args.value}" must be "true" or "false"`);
    }

    if (args.valueType === "json") {
      try {
        JSON.parse(args.value);
      } catch {
        throw new Error("Value is not valid JSON");
      }
    }

    const existing = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        valueType: args.valueType,
        label: args.label,
        description: args.description,
        group: args.group,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("oracle_settings", {
      ...args,
      updatedAt: Date.now(),
      updatedBy: userId,
    });
  },
});
