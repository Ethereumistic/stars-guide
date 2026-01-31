import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";
import GitHub from "@auth/core/providers/github";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        Google,
        Apple,
        GitHub,
        Password({
            profile(params: any) {
                return {
                    email: params.email as string,
                    name: (params.name as string) ?? undefined,
                    birthData: params.birthData ? (typeof params.birthData === "string" ? JSON.parse(params.birthData) : params.birthData) : undefined,
                };
            },
        }),
    ],
    callbacks: {
        async createOrUpdateUser(ctx, args) {
            if (args.existingUserId) return args.existingUserId;

            const userId = await ctx.db.insert("users", {
                name: args.profile.name ?? undefined,
                email: args.profile.email ?? undefined,
                image: args.profile.image ?? undefined,
                birthData: args.profile.birthData, // Save birth data atomically if provided
                role: "user",
                tier: "free",
                subscriptionStatus: "none",
                preferences: {
                    dailySparkTime: "07:00",
                    notifications: true,
                    theme: "system"
                },
                featureFlags: {
                    canAccessOracle: false,
                    isBetaTester: false
                }
            });

            return userId;
        },
    },
});
