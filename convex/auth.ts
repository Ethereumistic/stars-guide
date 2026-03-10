import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";
import GitHub from "@auth/core/providers/github";
import Twitter from "@auth/core/providers/twitter";
import Facebook from "@auth/core/providers/facebook";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        Google,
        Apple,
        GitHub,
        Twitter,
        Facebook,
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

            // Check if a user with this email already exists to link accounts
            if (args.profile.email) {
                const existingUser = await (ctx.db as any)
                    .query("users")
                    .withIndex("by_email", (q: any) => q.eq("email", args.profile.email as string))
                    .first();

                if (existingUser) {
                    return existingUser._id;
                }
            }

            // Generate a strictly unique username
            let baseName = (args.profile.email as string)?.split('@')[0] || (args.profile.name as string)?.replace(/\s+/g, '') || "user";
            baseName = baseName.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 10);
            if (!baseName) baseName = "user";

            let generatedUsername = "";
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 10) {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
                const testUsername = `${baseName}${randomSuffix}`.substring(0, 15);

                const existing = await (ctx.db as any)
                    .query("users")
                    .withIndex("by_username", (q: any) => q.eq("username", testUsername))
                    .first();

                if (!existing) {
                    generatedUsername = testUsername;
                    isUnique = true;
                }
                attempts++;
            }
            if (!generatedUsername) {
                generatedUsername = `u${Date.now().toString().substring(5, 15)}`;
            }

            const userId = await ctx.db.insert("users", {
                email: args.profile.email ?? undefined,
                image: args.profile.image ?? undefined,
                birthData: args.profile.birthData, // Save birth data atomically if provided
                username: generatedUsername,
                stardust: 0,
                role: "user",
                tier: "free",
                subscriptionStatus: "none",
                preferences: {
                    dailySparkTime: "07:00",
                    notifications: true,
                    theme: "dark"
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
