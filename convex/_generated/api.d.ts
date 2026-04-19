/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiQueries from "../aiQueries.js";
import type * as auth from "../auth.js";
import type * as cosmicWeather from "../cosmicWeather.js";
import type * as crons from "../crons.js";
import type * as hooks from "../hooks.js";
import type * as horoscopes from "../horoscopes.js";
import type * as http from "../http.js";
import type * as lib_adminGuard from "../lib/adminGuard.js";
import type * as lib_astronomyEngine from "../lib/astronomyEngine.js";
import type * as oracle_features from "../oracle/features.js";
import type * as oracle_llm from "../oracle/llm.js";
import type * as oracle_quota from "../oracle/quota.js";
import type * as oracle_sessions from "../oracle/sessions.js";
import type * as oracle_settings from "../oracle/settings.js";
import type * as oracle_upsertProviders from "../oracle/upsertProviders.js";
import type * as referrals from "../referrals.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiQueries: typeof aiQueries;
  auth: typeof auth;
  cosmicWeather: typeof cosmicWeather;
  crons: typeof crons;
  hooks: typeof hooks;
  horoscopes: typeof horoscopes;
  http: typeof http;
  "lib/adminGuard": typeof lib_adminGuard;
  "lib/astronomyEngine": typeof lib_astronomyEngine;
  "oracle/features": typeof oracle_features;
  "oracle/llm": typeof oracle_llm;
  "oracle/quota": typeof oracle_quota;
  "oracle/sessions": typeof oracle_sessions;
  "oracle/settings": typeof oracle_settings;
  "oracle/upsertProviders": typeof oracle_upsertProviders;
  referrals: typeof referrals;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
