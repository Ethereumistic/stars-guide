import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";
import GitHub from "@auth/core/providers/github";
import Twitter from "@auth/core/providers/twitter";
import Facebook from "@auth/core/providers/facebook";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { verifyGoogleIdToken } from "./lib/googleIdToken";
import { verifyEmailProvider, resetEmailProvider } from "./auth/emailProviders";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        Google,
        Apple,
        GitHub,
        Twitter,
        Facebook,
        // ──────────────────────────────────────────────────────────────────
        // Google One Tap & popup sign-in.
        //
        // Verifies ID tokens from the Google Identity Services client script.
        // Finds or creates users, links to existing Google OAuth accounts, and
        // returns a userId — all without a page redirect.
        //
        // This runs inside a Convex *action* context (no ctx.db).
        // We use retrieveAccount/createAccount helpers for DB access.
        // ──────────────────────────────────────────────────────────────────
        ConvexCredentials({
            id: "google-onetap",
            authorize: async (credentials, ctx) => {
                const credential = credentials.credential as string | undefined;
                if (!credential) return null;

                // Verify the Google ID token
                const clientId = process.env.AUTH_GOOGLE_ID as string;
                const payload = await verifyGoogleIdToken(credential, clientId);
                if (!payload) return null;

                const { sub, email, name, picture } = payload;

                // ── Step 1: Try to find an existing auth account ──
                // Using provider "google" means One Tap and OAuth share the
                // same account record — no duplicate accounts.
                const existingAccount = await retrieveAccount(ctx, {
                    provider: "google",
                    account: { id: sub },
                });

                if (existingAccount) {
                    return { userId: existingAccount.user._id };
                }

                // ── Step 2: No Google account found — create a new one ──
                // createAccount will:
                //   1. Call our createOrUpdateUser callback (which links by
                //      email and generates a username)
                //   2. Create an authAccount with provider="google" and
                //      providerAccountId=sub
                // We use shouldLinkViaEmail so that if a user with the same
                // verified email already exists (e.g. signed up with password),
                // their accounts are automatically linked.
                try {
                    const result = await createAccount(ctx, {
                        provider: "google",
                        account: { id: sub },
                        profile: {
                            email: email ?? undefined,
                            name: name ?? undefined,
                            image: picture ?? undefined,
                            // Required fields with defaults (our createOrUpdateUser
                            // callback will set these, but createAccount's type
                            // requires them)
                            tier: "free",
                            subscriptionStatus: "none",
                            role: "user",
                            stardust: 0,
                            username: "", // Will be overwritten by createOrUpdateUser
                            settings: {
                                publicChart: 2,
                                notifications: true,
                            },
                            preferences: {
                                dailySparkTime: "07:00",
                                theme: "dark",
                            },
                        } as any, // Cast because some fields have defaults in createOrUpdateUser
                        shouldLinkViaEmail: payload.email_verified && !!email,
                    });

                    return { userId: result.user._id };
                } catch (error) {
                    console.error("[google-onetap] createAccount failed:", error);
                    return null;
                }
            },
        }),
        Password({
            verify: verifyEmailProvider,
            reset: resetEmailProvider,
            profile(params: any) {
                return {
                    email: params.email as string,
                    name: (params.name as string) ?? undefined,
                    birthData: params.birthData ? (typeof params.birthData === "string" ? JSON.parse(params.birthData) : params.birthData) : undefined,
                };
            },
        }),
    ],

    // ── Redirect callback ─────────────────────────────────────────────────
    // Controls where users land after OAuth sign-in and magic links.
    //
    // In production, `SITE_URL` (Convex env var) determines the base URL.
    // When `DEVELOPMENT_URL` is set on the Convex deployment, all
    // post-OAuth redirects go there instead — this enables HTTPS
    // debugging via ngrok / tunnels on mobile devices.
    //
    // Set DEVELOPMENT_URL:  npx convex env set DEVELOPMENT_URL https://xxx.ngrok-free.app
    // Remove when done:    npx convex env rm DEVELOPMENT_URL
    callbacks: {
        async redirect({ redirectTo }) {
            // DEVELOPMENT_URL takes priority so we can route OAuth
            // redirects to an ngrok / tunnel URL during local dev.
            const baseUrl = (
                process.env.DEVELOPMENT_URL || process.env.SITE_URL || ""
            ).replace(/\/$/, "");

            if (!baseUrl) {
                throw new Error(
                    "Convex Auth: Neither DEVELOPMENT_URL nor SITE_URL is set. " +
                    "Set SITE_URL (production) or DEVELOPMENT_URL (dev tunnel) on your Convex deployment.",
                );
            }

            // Relative paths ("/dashboard") and query-params ("?next=/foo")
            if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
                return `${baseUrl}${redirectTo}`;
            }

            // Absolute URL that already starts with the base URL — allow through
            if (redirectTo.startsWith(baseUrl)) {
                return redirectTo;
            }

            // When DEVELOPMENT_URL is active, also accept production SITE_URL
            // redirects and reroute them to the dev tunnel.
            const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
            if (
                siteUrl &&
                siteUrl !== baseUrl &&
                redirectTo.startsWith(siteUrl)
            ) {
                return redirectTo.replace(siteUrl, baseUrl);
            }

            throw new Error(
                `Invalid \`redirectTo\` ${redirectTo} — must start with ${baseUrl}` +
                    (siteUrl ? ` or ${siteUrl}` : ""),
            );
        },

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
                    theme: "dark"
                },
                settings: {
                    publicChart: 2,
                    notifications: true
                }
            });

            return userId;
        },
    },
});