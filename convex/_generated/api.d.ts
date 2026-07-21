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
import type * as aiGateway_admin from "../aiGateway/admin.js";
import type * as aiGateway_runtime from "../aiGateway/runtime.js";
import type * as aiGateway_streaming from "../aiGateway/streaming.js";
import type * as aiGateway_userModelOptions from "../aiGateway/userModelOptions.js";
import type * as aiQueries from "../aiQueries.js";
import type * as analytics from "../analytics.js";
import type * as analyticsInternal from "../analyticsInternal.js";
import type * as auth from "../auth.js";
import type * as auth_emailProviders from "../auth/emailProviders.js";
import type * as birthChartReport_generate from "../birthChartReport/generate.js";
import type * as birthChartReport_mutations from "../birthChartReport/mutations.js";
import type * as birthChartReport_onboarding from "../birthChartReport/onboarding.js";
import type * as birthChartReport_prompts from "../birthChartReport/prompts.js";
import type * as birthChartReport_quality from "../birthChartReport/quality.js";
import type * as birthChartReport_queue from "../birthChartReport/queue.js";
import type * as birthChartReport_v2 from "../birthChartReport/v2.js";
import type * as birthChartReport_v3 from "../birthChartReport/v3.js";
import type * as birthChartReport_worker from "../birthChartReport/worker.js";
import type * as cosmicWeather from "../cosmicWeather.js";
import type * as crons from "../crons.js";
import type * as email_crons from "../email/crons.js";
import type * as email_leads from "../email/leads.js";
import type * as email_lib from "../email/lib.js";
import type * as email_queries from "../email/queries.js";
import type * as email_sender from "../email/sender.js";
import type * as email_unsubscribe from "../email/unsubscribe.js";
import type * as email_unsubscribeActions from "../email/unsubscribeActions.js";
import type * as email_unsubscribeHttp from "../email/unsubscribeHttp.js";
import type * as email_webhooks from "../email/webhooks.js";
import type * as emails_admin from "../emails/admin.js";
import type * as emails_templateRenderer from "../emails/templateRenderer.js";
import type * as files from "../files.js";
import type * as friends from "../friends.js";
import type * as hooks from "../hooks.js";
import type * as horoscopes from "../horoscopes.js";
import type * as horoscopes_admin from "../horoscopes/admin.js";
import type * as horoscopes_computeDailyContext from "../horoscopes/computeDailyContext.js";
import type * as horoscopes_generateForSign from "../horoscopes/generateForSign.js";
import type * as horoscopes_helpers from "../horoscopes/helpers.js";
import type * as horoscopes_prompt from "../horoscopes/prompt.js";
import type * as horoscopes_queries from "../horoscopes/queries.js";
import type * as horoscopes_queueDailyGenerations from "../horoscopes/queueDailyGenerations.js";
import type * as horoscopes_ratings from "../horoscopes/ratings.js";
import type * as http from "../http.js";
import type * as journal_admin from "../journal/admin.js";
import type * as journal_astroContext from "../journal/astroContext.js";
import type * as journal_consent from "../journal/consent.js";
import type * as journal_context from "../journal/context.js";
import type * as journal_entries from "../journal/entries.js";
import type * as journal_prompts from "../journal/prompts.js";
import type * as journal_search from "../journal/search.js";
import type * as journal_settings from "../journal/settings.js";
import type * as journal_stats from "../journal/stats.js";
import type * as journal_streaks from "../journal/streaks.js";
import type * as lib_adminGuard from "../lib/adminGuard.js";
import type * as lib_astrology_contextBuilder from "../lib/astrology/contextBuilder.js";
import type * as lib_astrology_signTraits from "../lib/astrology/signTraits.js";
import type * as lib_astronomyEngine from "../lib/astronomyEngine.js";
import type * as lib_googleIdToken from "../lib/googleIdToken.js";
import type * as lib_llmProvider from "../lib/llmProvider.js";
import type * as notifications_admin from "../notifications/admin.js";
import type * as notifications_delivery from "../notifications/delivery.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as oracle_debug from "../oracle/debug.js";
import type * as oracle_evaluation from "../oracle/evaluation.js";
import type * as oracle_evaluationStore from "../oracle/evaluationStore.js";
import type * as oracle_features from "../oracle/features.js";
import type * as oracle_feedback from "../oracle/feedback.js";
import type * as oracle_intentGateway from "../oracle/intentGateway.js";
import type * as oracle_llm from "../oracle/llm.js";
import type * as oracle_migrateQuotaV2 from "../oracle/migrateQuotaV2.js";
import type * as oracle_pricing from "../oracle/pricing.js";
import type * as oracle_providerRouter from "../oracle/providerRouter.js";
import type * as oracle_quota from "../oracle/quota.js";
import type * as oracle_seedOracleQuotaSettings from "../oracle/seedOracleQuotaSettings.js";
import type * as oracle_sessions from "../oracle/sessions.js";
import type * as oracle_settings from "../oracle/settings.js";
import type * as oracle_synastry from "../oracle/synastry.js";
import type * as oracle_timespace from "../oracle/timespace.js";
import type * as oracle_traces from "../oracle/traces.js";
import type * as oracle_upsertProviders from "../oracle/upsertProviders.js";
import type * as referrals from "../referrals.js";
import type * as usernameModeration from "../usernameModeration.js";
import type * as users from "../users.js";
import type * as users_activity from "../users/activity.js";
import type * as users_admin from "../users/admin.js";
import type * as users_crons from "../users/crons.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  "aiGateway/admin": typeof aiGateway_admin;
  "aiGateway/runtime": typeof aiGateway_runtime;
  "aiGateway/streaming": typeof aiGateway_streaming;
  "aiGateway/userModelOptions": typeof aiGateway_userModelOptions;
  aiQueries: typeof aiQueries;
  analytics: typeof analytics;
  analyticsInternal: typeof analyticsInternal;
  auth: typeof auth;
  "auth/emailProviders": typeof auth_emailProviders;
  "birthChartReport/generate": typeof birthChartReport_generate;
  "birthChartReport/mutations": typeof birthChartReport_mutations;
  "birthChartReport/onboarding": typeof birthChartReport_onboarding;
  "birthChartReport/prompts": typeof birthChartReport_prompts;
  "birthChartReport/quality": typeof birthChartReport_quality;
  "birthChartReport/queue": typeof birthChartReport_queue;
  "birthChartReport/v2": typeof birthChartReport_v2;
  "birthChartReport/v3": typeof birthChartReport_v3;
  "birthChartReport/worker": typeof birthChartReport_worker;
  cosmicWeather: typeof cosmicWeather;
  crons: typeof crons;
  "email/crons": typeof email_crons;
  "email/leads": typeof email_leads;
  "email/lib": typeof email_lib;
  "email/queries": typeof email_queries;
  "email/sender": typeof email_sender;
  "email/unsubscribe": typeof email_unsubscribe;
  "email/unsubscribeActions": typeof email_unsubscribeActions;
  "email/unsubscribeHttp": typeof email_unsubscribeHttp;
  "email/webhooks": typeof email_webhooks;
  "emails/admin": typeof emails_admin;
  "emails/templateRenderer": typeof emails_templateRenderer;
  files: typeof files;
  friends: typeof friends;
  hooks: typeof hooks;
  horoscopes: typeof horoscopes;
  "horoscopes/admin": typeof horoscopes_admin;
  "horoscopes/computeDailyContext": typeof horoscopes_computeDailyContext;
  "horoscopes/generateForSign": typeof horoscopes_generateForSign;
  "horoscopes/helpers": typeof horoscopes_helpers;
  "horoscopes/prompt": typeof horoscopes_prompt;
  "horoscopes/queries": typeof horoscopes_queries;
  "horoscopes/queueDailyGenerations": typeof horoscopes_queueDailyGenerations;
  "horoscopes/ratings": typeof horoscopes_ratings;
  http: typeof http;
  "journal/admin": typeof journal_admin;
  "journal/astroContext": typeof journal_astroContext;
  "journal/consent": typeof journal_consent;
  "journal/context": typeof journal_context;
  "journal/entries": typeof journal_entries;
  "journal/prompts": typeof journal_prompts;
  "journal/search": typeof journal_search;
  "journal/settings": typeof journal_settings;
  "journal/stats": typeof journal_stats;
  "journal/streaks": typeof journal_streaks;
  "lib/adminGuard": typeof lib_adminGuard;
  "lib/astrology/contextBuilder": typeof lib_astrology_contextBuilder;
  "lib/astrology/signTraits": typeof lib_astrology_signTraits;
  "lib/astronomyEngine": typeof lib_astronomyEngine;
  "lib/googleIdToken": typeof lib_googleIdToken;
  "lib/llmProvider": typeof lib_llmProvider;
  "notifications/admin": typeof notifications_admin;
  "notifications/delivery": typeof notifications_delivery;
  "notifications/queries": typeof notifications_queries;
  "oracle/debug": typeof oracle_debug;
  "oracle/evaluation": typeof oracle_evaluation;
  "oracle/evaluationStore": typeof oracle_evaluationStore;
  "oracle/features": typeof oracle_features;
  "oracle/feedback": typeof oracle_feedback;
  "oracle/intentGateway": typeof oracle_intentGateway;
  "oracle/llm": typeof oracle_llm;
  "oracle/migrateQuotaV2": typeof oracle_migrateQuotaV2;
  "oracle/pricing": typeof oracle_pricing;
  "oracle/providerRouter": typeof oracle_providerRouter;
  "oracle/quota": typeof oracle_quota;
  "oracle/seedOracleQuotaSettings": typeof oracle_seedOracleQuotaSettings;
  "oracle/sessions": typeof oracle_sessions;
  "oracle/settings": typeof oracle_settings;
  "oracle/synastry": typeof oracle_synastry;
  "oracle/timespace": typeof oracle_timespace;
  "oracle/traces": typeof oracle_traces;
  "oracle/upsertProviders": typeof oracle_upsertProviders;
  referrals: typeof referrals;
  usernameModeration: typeof usernameModeration;
  users: typeof users;
  "users/activity": typeof users_activity;
  "users/admin": typeof users_admin;
  "users/crons": typeof users_crons;
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
