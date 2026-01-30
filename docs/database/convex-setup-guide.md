# stars.guide Convex Setup Guide

## Phase 1: Installation

1.  **Install dependencies:**
    We need the Convex backend, the Auth library, and the Core Auth providers.
    ```bash
    pnpm install convex @convex-dev/auth @auth/core
    ```

2.  **Initialize Convex:**
    ```bash
    pnpm dlx convex dev
    ```
    * This will create your `convex/` folder and `.env.local`.

## Phase 2: Configuration

1.  **File Placement:**
    * Copy the provided `schema.ts` -> `convex/schema.ts`
    * Copy the provided `auth.ts` -> `convex/auth.ts`

2.  **Environment Variables (`.env.local`):**
    You must populate these keys.
    ```bash
    # Convex (Generated automatically)
    CONVEX_DEPLOYMENT=...
    NEXT_PUBLIC_CONVEX_URL=...

    # Auth Config (Required by @convex-dev/auth)
    # Generate this with: `openssl rand -hex 32`
    AUTH_SECRET=...

    # Providers (Get these from Google/Apple Developer Consoles)
    AUTH_GOOGLE_ID=...
    AUTH_GOOGLE_SECRET=...
    AUTH_APPLE_ID=...
    AUTH_APPLE_SECRET=...
    ```

## Phase 3: Deployment & Verification

1.  **Push the Schema:**
    Run the dev server to push your new schema structure.
    ```bash
    npx convex dev
    ```

2.  **Verify in Dashboard:**
    * Open `https://dashboard.convex.dev`
    * Check "Data" tab.
    * You should see: `users`, `subscription_history`, `auth_sessions`, `auth_accounts`.
    * **Crucial:** Check `users` table schema to ensure `tier`, `birthData`, and `role` columns exist.

3.  **Frontend Integration:**
    Wrap your root layout in `ConvexAuthNextjsServerProvider`.
    *(See standard Convex Auth docs for the `layout.tsx` code).*

## Phase 4: The Onboarding Flow Logic

Since we use the **Single Table Strategy**, your frontend logic is simple:

1.  User Signs In (Google/Apple).
2.  `useQuery(api.users.current)` returns the user object.
3.  **Check:** `if (!user.birthData) { router.push("/onboarding") }`
4.  **Onboarding:** User enters birth time -> Frontend calculates positions -> Calls `api.users.updateBirthData`.
5.  **Redirect:** User goes to Dashboard.