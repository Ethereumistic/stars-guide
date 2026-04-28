/**
 * Reserved usernames that cannot be registered.
 *
 * These are blocked for two reasons:
 * 1. **Route conflicts** — usernames that would clash with app routes (Next.js
 *    static routes win, but the user's profile would become unreachable)
 * 2. **System / abuse** — platform-reserved names, admin paths, confusing terms
 *
 * All comparisons must be case-insensitive.
 */

// ─── App routes (must stay in sync with src/app directory) ───
const APP_ROUTES = [
  // Top-level pages
  "dashboard",
  "settings",
  "horoscopes",
  "learn",
  "oracle",
  "journal",
  "onboarding",
  "pricing",
  "privacy",
  "terms",
  "admin",

  // Learn sub-paths (someone might type /learn directly)
  "signs",
  "planets",
  "houses",
  "aspects",

  // Auth
  "sign-in",
  "sign-up",
  "forgot-password",
  "auth",

  // App system paths
  "api",
  "_next",
  "_vercel",
  "invite",
  "stars",

  // Journal sub-paths
  "new",
  "calendar",
  "search",
  "stats",
  "edit",

  // Oracle sub-paths
  "chat",

  // Dashboard sub-paths
  "1",
] as const;

// ─── Platform / confusion / abuse prevention ───
const PLATFORM_RESERVED = [
  // Platform identity
  "stars",
  "starsguide",
  "stars_guide",
  "starsguideapp",

  // Common confusion vectors
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "help",
  "system",
  "null",
  "undefined",
  "root",
  "nobody",
  "anonymous",
  "me",
  "self",
  "user",
  "users",
  "profile",
  "profiles",
  "home",
  "index",
  "about",
  "contact",
  "blog",
  "news",
  "changelog",
  "status",

  // Brand safety
  "god",
  "jesus",
  "satan",
  "devil",
  "fuck",
  "shit",
  "ass",
  "nazi",
  "racist",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "faggot",
  "cunt",
  "chink",
  "kkk",
  "snowflake",


] as const;

// ─── Combine & deduplicate ───
const ALL_RESERVED = new Set(
  [...APP_ROUTES, ...PLATFORM_RESERVED].map((s) => s.toLowerCase()),
);

/** Check if a username is reserved. Case-insensitive. */
export function isReservedUsername(username: string): boolean {
  return ALL_RESERVED.has(username.trim().toLowerCase());
}

/** Get the full set (useful for tests / diagnostics). */
export function getReservedUsernames(): Set<string> {
  return new Set(ALL_RESERVED);
}