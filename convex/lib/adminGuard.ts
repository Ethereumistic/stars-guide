import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Shared admin authorization guard.
 * Every admin-facing query/mutation MUST call this first.
 * 
 * Security: This is the REAL enforcement layer (Layer 2).
 * A motivated attacker can call Convex functions directly, bypassing
 * the Next.js UI entirely. This guard is the law.
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
