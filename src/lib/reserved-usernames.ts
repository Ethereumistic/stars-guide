/**
 * Route-conflict usernames that cannot be registered.
 *
 * This list ONLY contains names that would clash with app routes or
 * system paths. Offensive / prohibited patterns live in the database
 * (`bannedPatterns` table) so they can be updated without a deploy.
 *
 * All comparisons are case-insensitive.
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

  // Learn sub-paths
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

// ─── Platform identity & confusion vectors ───
const PLATFORM_RESERVED = [
  // Platform identity
  "stars",
  "starsguide",
  "stars_guide",
  "starsguideapp",

  // Confusion vectors
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
] as const;

// ─── Combine & deduplicate ───
const ALL_RESERVED = new Set(
  [...APP_ROUTES, ...PLATFORM_RESERVED].map((s) => s.toLowerCase()),
);

/** Check if a username conflicts with a route or platform name. Case-insensitive. */
export function isReservedUsername(username: string): boolean {
  return ALL_RESERVED.has(username.trim().toLowerCase());
}

/** Get the full set (useful for tests / diagnostics). */
export function getReservedUsernames(): Set<string> {
  return new Set(ALL_RESERVED);
}