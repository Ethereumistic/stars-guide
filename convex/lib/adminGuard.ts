import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Shared admin authorization guard for queries and mutations.
 * Checks auth and verifies the user has admin role.
 * NOTE: Only works in query/mutation context (has ctx.db).
 * For action context, use requireAdminAction instead.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHORIZED: Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
        throw new Error("FORBIDDEN: Admin access required");
    }
    return { userId, user };
}