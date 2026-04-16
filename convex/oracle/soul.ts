import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import {
  DEFAULT_SOUL_DOCS,
  SOUL_DOC_DEFINITIONS,
  SOUL_DOC_KEYS,
} from "../../lib/oracle/soul";

const soulDocKeyValidator = v.union(
  v.literal("soul_identity"),
  v.literal("soul_tone_voice"),
  v.literal("soul_capabilities"),
  v.literal("soul_hard_constraints"),
  v.literal("soul_special_questions"),
  v.literal("soul_output_format"),
  v.literal("soul_closing_anchor"),
);

async function getCurrentSoulVersion(ctx: any, key: string) {
  const versions = await ctx.db
    .query("oracle_prompt_versions")
    .withIndex("by_entity", (q: any) => q.eq("entityType", "soul_doc" as any).eq("entityId", key))
    .collect();

  return versions.length + 1;
}

export const getAllSoulDocs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const settings = await ctx.db
      .query("oracle_settings")
      .withIndex("by_group", (q) => q.eq("group", "soul"))
      .collect();

    const settingsMap = new Map(settings.map((setting) => [setting.key, setting]));

    return await Promise.all(
      SOUL_DOC_KEYS.map(async (key) => {
        const setting = settingsMap.get(key);
        const currentVersion = await getCurrentSoulVersion(ctx, key);
        const updatedByUser = setting?.updatedBy ? await ctx.db.get(setting.updatedBy) : null;

        return {
          key,
          label: SOUL_DOC_DEFINITIONS[key].label,
          description: SOUL_DOC_DEFINITIONS[key].description,
          guidance: SOUL_DOC_DEFINITIONS[key].guidance,
          value: setting?.value ?? DEFAULT_SOUL_DOCS[key],
          version: currentVersion,
          updatedAt: setting?.updatedAt ?? null,
          updatedBy: updatedByUser?.email ?? null,
        };
      }),
    );
  },
});

export const saveSoulDoc = mutation({
  args: {
    key: soulDocKeyValidator,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const content = args.content.trim();
    if (!content) {
      throw new Error("Soul document content cannot be empty");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const currentVersion = await getCurrentSoulVersion(ctx, args.key);

    if (existing) {
      await ctx.db.insert("oracle_prompt_versions", {
        entityType: "soul_doc" as any,
        entityId: args.key,
        content: existing.value,
        version: currentVersion,
        savedBy: userId,
        savedAt: now,
      });

      await ctx.db.patch(existing._id, {
        value: content,
        valueType: "string",
        label: SOUL_DOC_DEFINITIONS[args.key].label,
        description: SOUL_DOC_DEFINITIONS[args.key].description,
        group: "soul",
        updatedAt: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("oracle_settings", {
        key: args.key,
        value: content,
        valueType: "string",
        label: SOUL_DOC_DEFINITIONS[args.key].label,
        description: SOUL_DOC_DEFINITIONS[args.key].description,
        group: "soul",
        updatedAt: now,
        updatedBy: userId,
      });
    }

    return {
      key: args.key,
      version: existing ? currentVersion + 1 : 1,
      updatedAt: now,
    };
  },
});

export const getSoulDocVersionHistory = query({
  args: {
    key: soulDocKeyValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const versions = await ctx.db
      .query("oracle_prompt_versions")
      .withIndex("by_entity", (q) => q.eq("entityType", "soul_doc" as any).eq("entityId", args.key))
      .order("desc")
      .collect();

    return await Promise.all(
      versions.map(async (version) => {
        const savedByUser = version.savedBy ? await ctx.db.get(version.savedBy) : null;
        return {
          ...version,
          savedByEmail: savedByUser?.email ?? null,
        };
      }),
    );
  },
});

export const labelSoulDocVersion = mutation({
  args: {
    versionId: v.id("oracle_prompt_versions"),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.versionId, {
      label: args.label?.trim() || undefined,
    });
    return args.versionId;
  },
});

export const restoreSoulDocVersion = mutation({
  args: {
    key: soulDocKeyValidator,
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();

    const currentSetting = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!currentSetting) {
      throw new Error("Soul document not found");
    }

    const versionToRestore = await ctx.db
      .query("oracle_prompt_versions")
      .withIndex("by_entity_version", (q) =>
        q.eq("entityType", "soul_doc" as any).eq("entityId", args.key).eq("version", args.version),
      )
      .first();

    if (!versionToRestore) {
      throw new Error("Requested version not found");
    }

    const currentVersion = await getCurrentSoulVersion(ctx, args.key);

    await ctx.db.insert("oracle_prompt_versions", {
      entityType: "soul_doc" as any,
      entityId: args.key,
      content: currentSetting.value,
      version: currentVersion,
      savedBy: userId,
      savedAt: now,
      label: `backup-before-restore-v${args.version}`,
    });

    await ctx.db.patch(currentSetting._id, {
      value: versionToRestore.content,
      updatedAt: now,
      updatedBy: userId,
    });

    return {
      key: args.key,
      version: currentVersion + 1,
      updatedAt: now,
    };
  },
});

