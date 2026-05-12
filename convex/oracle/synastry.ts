/**
 * Synastry Helpers — Convex queries for friend birth data access
 *
 * These queries enforce privacy rules:
 * - publicChart: 0 → completely private, nobody can import
 * - publicChart: 1 → only friends can import (requires accepted friendship)
 * - publicChart: 2 → any authenticated user can import
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Find an existing friendship between two users (either direction).
 * Returns the friendship document or null.
 */
async function findExistingFriendship(
  ctx: any,
  userA: string,
  userB: string,
) {
  const forward = await ctx.db
    .query("friendships")
    .withIndex("by_requester_addressee", (q: any) =>
      q.eq("requesterId", userA).eq("addresseeId", userB),
    )
    .first();

  if (forward) return forward;

  return await ctx.db
    .query("friendships")
    .withIndex("by_requester_addressee", (q: any) =>
      q.eq("requesterId", userB).eq("addresseeId", userA),
    )
    .first();
}

/**
 * Get a friend's birth data for synastry import.
 * Respects the friend's publicChart privacy setting.
 *
 * Returns:
 * - { access: "granted", birthData, username } — if access is allowed
 * - { access: "denied", reason } — if access is not allowed
 */
export const getFriendBirthData = query({
  args: { friendUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { access: "denied" as const, reason: "Not authenticated" };
    }

    // 1. Verify friendship exists and is accepted
    const friendship = await findExistingFriendship(ctx, userId, args.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      return { access: "denied" as const, reason: "Not friends" };
    }

    // 2. Load the friend's user document
    const friend = await ctx.db.get(args.friendUserId);
    if (!friend) {
      return { access: "denied" as const, reason: "User not found" };
    }

    // 3. Check publicChart setting
    // Default is 2 (public) if not set
    const publicChart = friend.settings?.publicChart ?? 2;

    if (publicChart === 0) {
      return { access: "denied" as const, reason: "Chart is private" };
    }

    // publicChart === 1 (friends only) or === 2 (public) —
    // both allowed since we already verified friendship
    if (!friend.birthData) {
      return { access: "denied" as const, reason: "No birth data" };
    }

    return {
      access: "granted" as const,
      birthData: friend.birthData,
      username: friend.username ?? "Unknown",
    };
  },
});

/**
 * Batch version: Get birth data access status for ALL friends at once.
 * More efficient than calling getFriendBirthData per friend.
 *
 * Returns an array of { friendUserId, access, birthData?, username?, image?, reason? }
 */
export const getFriendsBirthDataBatch = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all accepted friendships
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const all = [...asRequester, ...asAddressee];
    const results: Array<{
      friendUserId: string;
      username: string;
      image?: string;
      access: "granted" | "denied";
      birthData?: any;
      reason?: string;
    }> = [];

    for (const f of all) {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const friend = await ctx.db.get(friendId);
      if (!friend) continue;

      const publicChart = (friend as any).settings?.publicChart ?? 2;

      if (publicChart === 0) {
        results.push({
          friendUserId: friendId,
          username: (friend as any).username ?? "Unknown",
          image: (friend as any).image ?? undefined,
          access: "denied",
          reason: "Chart is private",
        });
        continue;
      }

      if (!(friend as any).birthData) {
        results.push({
          friendUserId: friendId,
          username: (friend as any).username ?? "Unknown",
          image: (friend as any).image ?? undefined,
          access: "denied",
          reason: "No birth data",
        });
        continue;
      }

      results.push({
        friendUserId: friendId,
        username: (friend as any).username ?? "Unknown",
        image: (friend as any).image ?? undefined,
        access: "granted",
        birthData: (friend as any).birthData,
      });
    }

    return results;
  },
});