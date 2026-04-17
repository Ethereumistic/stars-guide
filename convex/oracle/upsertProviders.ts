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

    // Upsert providers_config
    const existingProviders = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "providers_config"))
      .first();

    if (existingProviders) {
      await ctx.db.patch(existingProviders._id, {
        value: args.providersConfig,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("oracle_settings", {
        key: "providers_config",
        value: args.providersConfig,
        valueType: "json",
        label: "Provider Configuration",
        group: "provider",
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }

    // Upsert model_chain
    const existingChain = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "model_chain"))
      .first();

    if (existingChain) {
      await ctx.db.patch(existingChain._id, {
        value: args.modelChain,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("oracle_settings", {
        key: "model_chain",
        value: args.modelChain,
        valueType: "json",
        label: "Model Fallback Chain",
        group: "model",
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }

    return { ok: true };
  },
});
