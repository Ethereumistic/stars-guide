/**
 * Google Identity Services (GIS) types and utilities for One Tap & popup sign-in.
 *
 * GIS documentation:
 * https://developers.google.com/identity/gsi/web/guides/migration
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
    | "itp"; // FedCM
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
 * IMPORTANT: Method names follow the real GIS API:
 *   - isDisplayMoment(), isSkippedMoment(), isDismissedMoment() → moment TYPE checks
 *   - isDisplayed(), isNotDisplayed() → status checks within the display moment
 *
 * In FedCM (ITP) mode, some methods are NOT available:
 *   - isDisplayMoment(), isDisplayed(), isNotDisplayed(), getNotDisplayedReason()
 *     are all absent when FedCM is handling the prompt.
 */
export interface PromptMomentNotification {
  /** True when this is a "display" moment (prompt shown or not-shown). */
  isDisplayMoment: () => boolean;
  /** True when One Tap was successfully displayed. */
  isDisplayed: () => boolean;
  /** True when One Tap could NOT be displayed. */
  isNotDisplayed: () => boolean;
  /** Reason the prompt was not displayed. */
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
  /** True when this is a "skipped" moment. */
  isSkippedMoment: () => boolean;
  /** Reason the prompt was skipped. */
  getSkippedReason: () =>
    | "auto_cancel"
    | "user_cancel"
    | "tap_outside"
    | "issuing_failed"
    | null;
  /** True when this is a "dismissed" moment (user dismissed or credential returned). */
  isDismissedMoment: () => boolean;
  /** Reason the prompt was dismissed. */
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
 */
export function initializeGoogleOneTap(
  clientId: string,
  callback: (response: CredentialResponse) => void,
  options?: {
    autoSelect?: boolean;
    cancelOnTapOutside?: boolean;
    context?: "signin" | "signup" | "use";
  },
): void {
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback,
    auto_select: options?.autoSelect ?? false,
    cancel_on_tap_outside: options?.cancelOnTapOutside ?? true,
    context: options?.context ?? "signin",
    itp_support: true,
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
 * In FedCM (ITP) mode some methods (isNotDisplayed, isDisplayed,
 * getNotDisplayedReason) may not exist on the notification object.
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