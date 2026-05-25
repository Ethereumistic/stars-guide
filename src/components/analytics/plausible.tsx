import Script from "next/script";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/**
 * Plausible Analytics script loader.
 *
 * - Only renders in production (when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set).
 * - Uses the self-hosted instance at analytics.stars.guide by default.
 * - To switch to Plausible Cloud, change src to https://plausible.io/js/script.js.
 */
export function PlausibleAnalytics() {
  if (!PLAUSIBLE_DOMAIN) return null;

  return (
    <Script
      src="https://analytics.stars.guide/js/script.js"
      data-domain={PLAUSIBLE_DOMAIN}
      strategy="afterInteractive"
    />
  );
}