import { internalMutation } from "../_generated/server";
import {
  DEFAULT_SOUL_DOCS,
  DEFAULT_TOKEN_LIMITS,
  SOUL_DOC_DEFINITIONS,
  SOUL_DOC_KEYS,
  TOKEN_LIMIT_DEFINITIONS,
  TOKEN_LIMIT_KEYS,
} from "../../lib/oracle/soul";

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
