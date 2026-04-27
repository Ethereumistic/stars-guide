import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function findUser(
    ctx: any,
    identifier: string,
    identifierType: "username" | "email" | "phone",
) {
    switch (identifierType) {
        case "username": {
            const normalized = identifier.trim();
            return await ctx.db
                .query("users")
                .withIndex("by_username", (q: any) => q.eq("username", normalized))
                .first();
        }
        case "email": {
            const normalized = identifier.trim().toLowerCase();
            return await ctx.db
                .query("users")
                .withIndex("by_email", (q: any) => q.eq("email", normalized))
                .first();
        }
        case "phone": {
            const normalized = identifier.trim();
            return await ctx.db
                .query("users")
                .withIndex("by_phone", (q: any) => q.eq("phone", normalized))
                .first();
        }
    }
}

async function findExistingFriendship(ctx: any, userA: string, userB: string) {
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

export const sendRequest = mutation({
    args: {
        identifier: v.string(),
        identifierType: v.union(
            v.literal("username"),
            v.literal("email"),
            v.literal("phone"),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const target = await findUser(ctx, args.identifier, args.identifierType);
        if (!target) throw new Error("User not found");

        if (target._id === userId) throw new Error("Cannot send a friend request to yourself");

        const existing = await findExistingFriendship(ctx, userId, target._id);
        if (existing) {
            if (existing.status === "accepted") throw new Error("Already friends");
            if (existing.status === "pending") throw new Error("Friend request already exists");
            await ctx.db.delete(existing._id);
        }

        const now = Date.now();
        const friendshipId = await ctx.db.insert("friendships", {
            requesterId: userId,
            addresseeId: target._id,
            status: "pending",
            createdAt: now,
            updatedAt: now,
        });

        const requester = await ctx.db.get(userId);
        await ctx.db.insert("notifications", {
            userId: target._id,
            type: "friend_request",
            fromUserId: userId,
            friendshipId,
            message: `${requester?.username ?? "Someone"} sent you a friend request`,
            read: false,
            createdAt: now,
        });

        return { success: true };
    },
});

export const acceptRequest = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Friend request not found");
        if (friendship.addresseeId !== userId) throw new Error("Not your friend request");
        if (friendship.status !== "pending") throw new Error("Request is no longer pending");

        const now = Date.now();
        await ctx.db.patch(args.friendshipId, {
            status: "accepted",
            updatedAt: now,
        });

        const addressee = await ctx.db.get(userId);
        await ctx.db.insert("notifications", {
            userId: friendship.requesterId,
            type: "friend_accepted",
            fromUserId: userId,
            friendshipId: args.friendshipId,
            message: `${addressee?.username ?? "Someone"} accepted your friend request`,
            read: false,
            createdAt: now,
        });

        return { success: true };
    },
});

export const declineRequest = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Friend request not found");
        if (friendship.addresseeId !== userId) throw new Error("Not your friend request");
        if (friendship.status !== "pending") throw new Error("Request is no longer pending");

        await ctx.db.patch(args.friendshipId, {
            status: "declined",
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

export const removeFriend = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Friendship not found");
        if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
            throw new Error("Not your friendship");
        }

        await ctx.db.delete(args.friendshipId);
        return { success: true };
    },
});

export const listFriends = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

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
        const results = [];

        for (const f of all) {
            const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
            const friend = await ctx.db.get(friendId);
            if (friend) {
                results.push({
                    friendshipId: f._id,
                    user: {
                        _id: friend._id,
                        username: friend.username,
                        image: friend.image,
                    },
                });
            }
        }

        return results;
    },
});

export const listPending = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const incoming = await ctx.db
            .query("friendships")
            .withIndex("by_addressee", (q) => q.eq("addresseeId", userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        const results = [];
        for (const f of incoming) {
            const requester = await ctx.db.get(f.requesterId);
            if (requester) {
                results.push({
                    friendshipId: f._id,
                    user: {
                        _id: requester._id,
                        username: requester.username,
                        image: requester.image,
                    },
                    createdAt: f.createdAt,
                });
            }
        }

        return results;
    },
});

export const listSent = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const outgoing = await ctx.db
            .query("friendships")
            .withIndex("by_requester", (q) => q.eq("requesterId", userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        const results = [];
        for (const f of outgoing) {
            const addressee = await ctx.db.get(f.addresseeId);
            if (addressee) {
                results.push({
                    friendshipId: f._id,
                    user: {
                        _id: addressee._id,
                        username: addressee.username,
                        image: addressee.image,
                    },
                    createdAt: f.createdAt,
                });
            }
        }

        return results;
    },
});

export const getFriendshipStatus = query({
    args: { targetUserId: v.id("users") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const friendship = await findExistingFriendship(ctx, userId, args.targetUserId);
        if (!friendship) return { status: "none" as const };

        if (friendship.status === "accepted") return { status: "accepted" as const, friendshipId: friendship._id };
        if (friendship.status === "pending") {
            return {
                status: "pending" as const,
                friendshipId: friendship._id,
                direction: friendship.requesterId === userId ? ("outgoing" as const) : ("incoming" as const),
            };
        }
        if (friendship.status === "declined") return { status: "declined" as const };

        return { status: "none" as const };
    },
});
