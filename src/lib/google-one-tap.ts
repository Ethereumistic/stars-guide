/**
 * Google Identity Services (GIS) types and utilities for One Tap & popup sign-in.
 *
 * GIS documentation:
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 *
 * FedCM migration guide:
 * https://developers.google.com/identity/gsi/web/guides/fedcm-migration
 *
 * KEY BEHAVIOUR CHANGE WITH FedCM:
 * When FedCM is enabled (Chrome 120+), the PromptMomentNotification changes:
 *   - isDisplayMoment(), isDisplayed(), isNotDisplayed(), getNotDisplayedReason()
 *     are NOT available — the moment listener won't report display moments.
 *   - isSkippedMoment() IS available (but getSkippedReason() returns null).
 *   - isDismissedMoment() and getDismissedReason() ARE fully available.
 *
 * This means: on FedCM browsers, when the prompt CAN'T show, you get
 * isSkippedMoment()=true (NOT isNotDisplayed()).  Code that only checks
 * isNotDisplayed() will miss this case and never fall back.
 */

// ---------------------------------------------------------------------------
// TypeScript declarations for the Google Identity Services API
// ---------------------------------------------------------------------------
interface IdConfiguration {
  client_id: string;
  callback?: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  close_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
  itp_support?: boolean;
  /** Allow the browser to control sign-in prompts via FedCM (Chrome 120+). */
  use_fedcm_for_prompt?: boolean;
  /** Use FedCM button UX on Chrome desktop M125+ / Android M128+. */
  use_fedcm_for_button?: boolean;
  log_events?: boolean;
  nonce?: string;
  state_cookie_domain?: string;
  ux_mode?: "popup" | "redirect";
  middle_man_iframe_url?: string;
}

export interface CredentialResponse {
  credential?: string; // JWT ID token
  select_by?:
    | "auto"
    | "user"
    | "google_onestap"
    | "btn"
    | "btn_confirm"
    | "btn_add_session"
    | "btn_confirm_link"
    | "card"
    | "card_confirm"
    | "card_add_session"
    | "card_confirm_link"
    | "itp"
    | "fedcm"
    | "fedcm_auto"; // FedCM select_by values
  client_id?: string;
}

interface RenderButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signup";
  shape?: "rectangular" | "pill" | "circle";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

/**
 * PromptMomentNotification — passed to the google.accounts.id.prompt()
 * callback.
 *
 * IMPORTANT — FedCM compatibility:
 *   - isDisplayMoment(), isDisplayed(), isNotDisplayed(), getNotDisplayedReason()
 *     are NOT available when FedCM is handling the prompt (Chrome 120+).
 *   - isSkippedMoment() IS available in FedCM mode (but getSkippedReason()
 *     returns null).
 *   - isDismissedMoment() and getDismissedReason() ARE fully supported.
 *
 * Non-FedCM browsers (Safari, Firefox with itp_support):
 *   - All methods are available.
 */
export interface PromptMomentNotification {
  /** True when this is a "display" moment (prompt shown or not-shown).
   *  NOT available in FedCM mode. */
  isDisplayMoment: () => boolean;
  /** True when One Tap was successfully displayed.
   *  NOT available in FedCM mode. */
  isDisplayed: () => boolean;
  /** True when One Tap could NOT be displayed.
   *  NOT available in FedCM mode — use isSkippedMoment() instead. */
  isNotDisplayed: () => boolean;
  /** Reason the prompt was not displayed.
   *  NOT available in FedCM mode. */
  getNotDisplayedReason: () =>
    | "browser_not_supported"
    | "invalid_client"
    | "missing_client_id"
    | "opt_out_or_no_session"
    | "secure_http_required"
    | "google_server_error"
    | "suppressed_by_user"
    | "untracked_failed"
    | "native_one_tap_already_started"
    | "native_one_tap_not_started"
    | "secure_http_required_on_web"
    | "native_one_tap_not_supported"
    | null;
  /** True when this is a "skipped" moment.
   *  Available in FedCM mode (but getSkippedReason() returns null). */
  isSkippedMoment: () => boolean;
  /** Reason the prompt was skipped.
   *  NOT available in FedCM mode — always returns null. */
  getSkippedReason: () =>
    | "auto_cancel"
    | "user_cancel"
    | "tap_outside"
    | "issuing_failed"
    | null;
  /** True when this is a "dismissed" moment (credential returned or user dismissed).
   *  Available in FedCM mode. */
  isDismissedMoment: () => boolean;
  /** Reason the prompt was dismissed.
   *  Available in FedCM mode. */
  getDismissedReason: () =>
    | "credential_returned"
    | "cancel_called"
    | "flow_restarted"
    | null;
  /** Returns the moment type string. */
  getMomentType: () => string;
}

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void;
  prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
  renderButton: (
    parent: HTMLElement,
    options: RenderButtonOptions,
    clickHandler?: () => void,
  ) => void;
  disableAutoSelect: () => void;
  cancel: () => void;
  revoke: (hint: string, callback: (done: { successful: boolean }) => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

// ---------------------------------------------------------------------------
// Google Client ID – exposed via NEXT_PUBLIC_ env var so the client can read it
// ---------------------------------------------------------------------------
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * Load the Google Identity Services script if it hasn't been loaded already.
 * Returns a promise that resolves when `window.google.accounts.id` is available.
 */
export function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    // Another call is already loading the script
    if (document.getElementById("google-identity-services")) {
      let attempts = 0;
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          resolve();
        }
        if (++attempts > 50) {
          clearInterval(interval);
          reject(new Error("Google Identity Services failed to load"));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        reject(new Error("Google Identity Services failed to initialize"));
      }
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services script"));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Identity Services and register the credential callback.
 *
 * Options:
 * - autoSelect:   Auto-select the user's Google account if only one session exists
 * - cancelOnTapOutside: Close the prompt if the user clicks outside it
 * - context:      "signin" | "signup" | "use"
 * - fedcmForPrompt: Enable FedCM for the One Tap prompt (Chrome 120+).
 *                   Recommended for mobile compatibility.
 */
export function initializeGoogleOneTap(
  clientId: string,
  callback: (response: CredentialResponse) => void,
  options?: {
    autoSelect?: boolean;
    cancelOnTapOutside?: boolean;
    context?: "signin" | "signup" | "use";
    fedcmForPrompt?: boolean;
  },
): void {
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback,
    auto_select: options?.autoSelect ?? false,
    cancel_on_tap_outside: options?.cancelOnTapOutside ?? true,
    context: options?.context ?? "signin",
    // Enable ITP support for Safari/Firefox (popup-based One Tap when
    // third-party cookies are blocked)
    itp_support: true,
    // Enable FedCM for the One Tap prompt on Chrome 120+.  FedCM provides
    // a native browser-managed sign-in prompt that works on mobile and
    // doesn't require third-party cookies.
    use_fedcm_for_prompt: options?.fedcmForPrompt ?? true,
  });
}

/**
 * Programmatically trigger the One Tap prompt (e.g. from a button click).
 */
export function promptGoogleOneTap(
  momentListener?: (notification: PromptMomentNotification) => void,
): void {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.prompt(momentListener);
}

/**
 * Cancel / dismiss the One Tap prompt.
 */
export function cancelGoogleOneTap(): void {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.cancel();
}

/**
 * Safely call a PromptMomentNotification method.
 *
 * In FedCM (ITP) mode some methods (isNotDisplayed, isDisplayed,
 * getNotDisplayedReason) may not exist on the notification object.
 * This wrapper catches TypeError and returns false instead of crashing.
 */
export function safeMomentCheck(
  notification: PromptMomentNotification | undefined,
  method: "isDisplayMoment" | "isDisplayed" | "isNotDisplayed" | "isSkippedMoment" | "isDismissedMoment",
): boolean {
  if (!notification) return false;
  try {
    const fn = notification[method];
    return typeof fn === "function" ? fn() : false;
  } catch {
    return false;
  }
}