# Google One Tap Auth Flow

## How it works — end to end

```
User visits /sign-in or /sign-up
         │
         ▼
┌─ GoogleOneTapProvider mounts ──────────────────────────┐
│  1. detect auth page                                    │
│  2. load GIS script (accounts.google.com/gsi/client)    │
│  3. initialize() with FedCM + ITP enabled               │
│  4. after 1 s → prompt() (auto-prompt)                  │
│     └─ isSkippedMoment → log only (don't auto-redirect) │
│     └─ isNotDisplayed  → log only                       │
│     └─ isDismissedMoment(credential_returned) → success │
│     └─ isDismissedMoment(other) → log only              │
└─────────────────────────────────────────────────────────┘
         │
         │  ┌──────────────────── Auto-prompt shown? ────────────────────┐
         │  │  YES (desktop Chrome, mobile Chrome w/ FedCM)             │
         │  │    → User sees One Tap card / FedCM sheet                 │
         │  │    → Selects account → callback fires                     │
         │  │    → signIn("google-onetap", { credential })              │
         │  │                                                            │
         │  │  NO (Safari, Brave, mobile Firefox, no Google session)    │
         │  │    → moment listener gets isSkippedMoment or isNotDisplayed│
         │  │    → No redirect (user can still click the button)         │
         │  └───────────────────────────────────────────────────────────┘
         │
         │  User clicks "Continue with Google"
         │         │
         │         ▼
         │  ┌─ useGoogleOneTap().triggerGoogleSignIn() ─────────────┐
         │  │  isLoading = true                                      │
         │  │                                                        │
         │  │  GIS loaded?                                           │
         │  │   YES → prompt() with moment listener                   │
         │  │   NO  → load GIS, initialize, prompt()                  │
         │  │                                                        │
         │  │  moment listener fires:                                 │
         │  │   isSkippedMoment   → fallbackToOAuthRedirect() NOW    │
         │  │   isNotDisplayed    → fallbackToOAuthRedirect() NOW    │
         │  │   isDismissedMoment(credential_returned) → keep loading│
         │  │   isDismissedMoment(other) → fallbackToOAuthRedirect()  │
         │  │   no callback in 5 s   → fallbackToOAuthRedirect() NOW │
         │  │   prompt() throws     → fallbackToOAuthRedirect() NOW │
         │  └────────────────────────────────────────────────────────┘
         │         │
         │         ▼
         │  ┌─ Credential received ───────────────────────────────┐
         │  │  signIn("google-onetap", { credential: jwt })         │
         │  │         │                                             │
         │  │         ▼                                             │
         │  │  Convex action: authorize()                           │
         │  │   1. verifyGoogleIdToken(jwt) → { sub, email, ... }  │
         │  │   2. retrieveAccount(ctx, { provider: "google",       │
         │  │        account: { id: sub } })                        │
         │  │      └─ found? → return { userId }                     │
         │  │   3. NOT found → createAccount(ctx, {                │
         │  │        provider: "google",                             │
         │  │        account: { id: sub },                          │
         │  │        profile: { email, name, image },               │
         │  │        shouldLinkViaEmail: true })                    │
         │  │      └─ creates authAccount + user                    │
         │  │      └─ calls createOrUpdateUser callback             │
         │  │         (generates username, checks email uniqueness) │
         │  │      └─ returns { userId }                            │
         │  └──────────────────────────────────────────────────────┘
         │
         │  ┌─ Fallback: OAuth redirect ───────────────────────────┐
         │  │  signIn("google", { redirectTo: "/dashboard" })       │
         │  │  → Convex Auth redirects browser to Google OAuth URL  │
         │  │  → User consents on Google's page                     │
         │  │  → Google redirects back to /api/auth/callback/google  │
         │  │  → Convex Auth processes the OAuth code                │
         │  │  → User is signed in (same account as One Tap)         │
         │  └──────────────────────────────────────────────────────┘
         │
         ▼
  User is authenticated → redirect to /dashboard or /onboarding
```

## FedCM compatibility matrix

| Browser            | One Tap | FedCM  | Fallback   |
|--------------------|---------|--------|------------|
| Chrome desktop     | ✅ card | ✅ yes | auto-prompt|
| Chrome Android     | ✅ card | ✅ yes | auto-prompt|
| Safari desktop     | ❌      | ⚠️ 16+| button → OAuth redirect |
| Safari iOS         | ❌      | ⚠️ 16+| button → OAuth redirect |
| Firefox            | ❌      | ❌     | button → OAuth redirect |
| Brave (desktop)    | ✅ card | ✅ yes | auto-prompt|
| Brave (mobile)     | ⚠️      | ✅ yes | button → OAuth redirect |

**FedCM** (Federated Credential Management) is the browser-native sign-in API
that replaces third-party cookies. When `use_fedcm_for_prompt: true` is set,
Chrome 120+ uses FedCM for the One Tap prompt.

## Moment notification handling

When `prompt()` calls the moment listener, the notification object differs
depending on whether FedCM is active:

### Without FedCM (Safari, Firefox, older Chrome)

```
isNotDisplayed()      → true if prompt couldn't show
getNotDisplayedReason() → "browser_not_supported", "opt_out_or_no_session", etc.
isSkippedMoment()    → true if auto-cancelled / user cancelled
isDismissedMoment()  → true when credential returned or dismissed
```

### With FedCM (Chrome 120+)

```
isDisplayMoment()    → REMOVED — always returns false / method missing
isDisplayed()        → REMOVED
isNotDisplayed()     → REMOVED — safeMomentCheck() returns false
getNotDisplayedReason() → REMOVED — always returns null

isSkippedMoment()    → WORKS — primary "can't show" signal
getSkippedReason()   → REMOVED — always returns null
isDismissedMoment()  → WORKS — "credential_returned" or "cancel_called"
getDismissedReason() → WORKS
```

**This is why we check `isSkippedMoment()` FIRST and fall back to OAuth
redirect.** Code that only checks `isNotDisplayed()` will miss every FedCM
"can't show" case on modern Chrome — which is the bug that caused "spins
forever on mobile."

## Safety timeout

On some mobile browsers the `prompt()` callback may never fire. The
`SAFETY_TIMEOUT_MS` constant (5 seconds) ensures the user is never stuck:
if no moment notification arrives within 5 s, the code automatically falls
back to OAuth redirect via `fallbackToOAuthRedirect()`.