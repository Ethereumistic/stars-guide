import { mutation, query, internalQuery, QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import {
  DEFAULT_ORACLE_SOUL,
  SOUL_DOC_KEY,
  MAX_RESPONSE_TOKENS_DEFAULT,
  MAX_CONTEXT_MESSAGES_DEFAULT,
} from "../../lib/oracle/soul";
import {
  parseProvidersConfig,
  parseModelChain,
  DEFAULT_MODEL_CHAIN,
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
    await requireAdmin(ctx);
    return await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

/**
 * Internal version of getSetting — no admin guard.
 * Used by invokeOracle action to read runtime config on behalf of regular users.
 */
export const getSettingInternal = internalQuery({
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
    await requireAdmin(ctx);
    return await ctx.db
      .query("oracle_settings")
      .withIndex("by_group", (q) => q.eq("group", group))
      .collect();
  },
});

export const getPromptRuntimeSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await _buildPromptRuntimeSettings(ctx);
  },
});

/**
 * Internal version of getPromptRuntimeSettings — no admin guard.
 * Used by invokeOracle action to read runtime config on behalf of regular users.
 */
export const getPromptRuntimeSettingsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await _buildPromptRuntimeSettings(ctx);
  },
});

/** Shared logic for building prompt runtime settings (no auth guard). */
async function _buildPromptRuntimeSettings(ctx: QueryCtx) {
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

    const modelChain = parseModelChain(modelMap.model_chain);
    const providers = parseProvidersConfig(providerMap.providers_config);

  return {
    // Unified soul document: single string instead of 7 separate docs
    soulDoc: soulMap[SOUL_DOC_KEY] ?? DEFAULT_ORACLE_SOUL,
    // Simple token limits: max_response_tokens and max_context_messages
    maxResponseTokens: Number.parseInt(tokenLimitMap.max_response_tokens ?? String(MAX_RESPONSE_TOKENS_DEFAULT), 10) || MAX_RESPONSE_TOKENS_DEFAULT,
    maxContextMessages: Number.parseInt(tokenLimitMap.max_context_messages ?? String(MAX_CONTEXT_MESSAGES_DEFAULT), 10) || MAX_CONTEXT_MESSAGES_DEFAULT,
    modelSettings: {
      temperature: Number.parseFloat(modelMap.temperature ?? "0.82"),
      topP: Number.parseFloat(modelMap.top_p ?? "0.92"),
      streamEnabled: modelMap.stream_enabled !== "false",
    },
    providers,
    modelChain: modelChain.length > 0 ? modelChain : DEFAULT_MODEL_CHAIN,
  };
}

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