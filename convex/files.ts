/**
 * files.ts — File storage helpers for journal photos.
 *
 * Provides generateUploadUrl for client-side uploads
 * and getUrl for retrieving stored file URLs.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Generate an upload URL for client-side file uploads to Convex storage.
 * Requires authentication.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Get the URL for a stored file by its storage ID.
 * Public — anyone with the storage ID can get the URL.
 * This is fine because the ID itself is the auth token.
 */
export const getUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        return await ctx.storage.getUrl(storageId);
    },
});