/**
 * Analytics event tracking — Plausible + Convex feature events.
 *
 * All calls are no-ops when the Plausible script is not loaded (dev mode,
 * ad-blockers, etc.) — `window.plausible` is undefined safe.
 *
 * Convex feature events are sent to the feature_events table for funnel
 * and DAU/MAU analytics. Falls back silently on network errors.
 *
 * Usage:
 *   import { trackSignupComplete } from "@/lib/analytics";
 *   trackSignupComplete({ tier: "free" });
 */

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// ─── Plausible types ────────────────────────────────────────────────────────

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

// ─── Convex helpers (lazy — imported without React context when called from non-hook context) ──

// Convex mutation handle — set once via setMutationHandle()
let _recordFeatureEvent: ReturnType<typeof useMutation<typeof api.analytics.recordFeatureEvent>> | null = null;
let _sessionId = "";
let _visitorId = "";

export function configureAnalytics(sessionId: string, visitorId: string) {
  _sessionId = sessionId;
  _visitorId = visitorId;
}

/** Must be called once from a React component context to bind the mutation handle. */
export function useAnalyticsMutation(
  recordFeatureEvent: ReturnType<typeof useMutation<typeof api.analytics.recordFeatureEvent>>,
) {
  _recordFeatureEvent = recordFeatureEvent;
}

function trackConvexEvent(
  eventName: string,
  metadata?: Record<string, string>,
  funnelStage?: "signup" | "activation" | "engagement" | "revenue",
) {
  if (!_recordFeatureEvent || !_sessionId) return;
  _recordFeatureEvent({
    eventName,
    userId: undefined, // Server will backfill via sessionId if needed
    sessionId: _sessionId,
    metadata: metadata ?? {},
    utmEventId: undefined,
    funnelStage,
  }).catch(() => {}); // Fire-and-forget
}

// ─── Plausible-only tracker ────────────────────────────────────────────────

function trackPlausible(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  window.plausible?.(name, props ? { props } : undefined);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  trackPlausible(name, props);
}

export function trackHoroscopeRead(sign: string) {
  trackPlausible("horoscope_read", { sign });
  trackConvexEvent("horoscope_read", { sign }, "engagement");
}

export function trackOracleChat() {
  trackPlausible("oracle_chat");
  trackConvexEvent("oracle_first", undefined, "activation");
}

export function trackJournalEntry() {
  trackPlausible("journal_entry");
  trackConvexEvent("journal_entry", undefined, "engagement");
}

export function trackSignupComplete(metadata?: Record<string, string>) {
  trackPlausible("signup_complete");
  trackConvexEvent("signup_completed", metadata, "signup");
}

export function trackPricingView() {
  trackPlausible("pricing_view");
}

export function trackUpgrade(tier: "popular" | "premium") {
  trackPlausible("upgrade", { tier });
  trackConvexEvent(`upgrade_to_${tier}`, { tier }, "revenue");
}

export function trackReferral() {
  trackConvexEvent("referral_completed", undefined, "engagement");
}

/** Track any feature usage with optional funnel stage. */
export function trackFeature(
  feature: string,
  metadata?: Record<string, string>,
  funnelStage?: "signup" | "activation" | "engagement" | "revenue",
) {
  trackPlausible(`feature_${feature}`, metadata);
  trackConvexEvent(`feature_${feature}`, metadata, funnelStage);
}
