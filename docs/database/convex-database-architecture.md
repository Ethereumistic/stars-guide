# stars.guide Database Architecture
## The Unified "Atomic User" Strategy

### Core Philosophy
For an agentic application like stars.guide, the AI needs instant access to the "User Context" (Who they are + What they pay for + Their Birth Chart) on every single request.

To achieve sub-millisecond context retrieval, we use a **Unified User Schema**. Instead of splitting data across a `users` table and a `profiles` table (which requires expensive joins and creates "zombie user" risks), we extend the core `users` table to hold everything.

### 1. The Unified `users` Table
**Primary Source of Truth.**
Managed jointly by **Convex Auth** (identity) and **stars.guide Logic** (subscription/astrology).

#### Data Segments:
1.  **Identity (Auth Managed):** `name`, `email`, `image`, `isAnonymous`.
2.  **The "Cosmic Flow" (Business Logic):**
    * `tier`: What they bought (`free` vs `cosmic_flow`).
    * `subscriptionStatus`: The state of that purchase (`active`, `canceled`).
    * `subEndsAt`: Date when access is revoked (crucial for "cancel at end of period").
3.  **The "Sanctuary" (Preferences):**
    * `dailySparkTime`: When they want their notification (default "07:00").
    * `notifications`: Global opt-in/out.
4.  **The "Static Core" (Astronomical Data):**
    * `birthData`: A nested JSON object containing the immutable birth chart data.
    * **Why here?** Loading the user *automatically* loads their birth chart. No second query needed.

### 2. The `subscription_history` Table
**The Audit Trail.**
This table is **append-only**. We never update rows here; we only insert new ones.

**Use Cases:**
* **Customer Support:** "Why did my subscription cancel on Tuesday?"
* **Analytics:** Calculating churn rate and upgrade velocity.
* **Debugging:** Tracing race conditions in payment webhooks.

### Scalability Limits
* **Reads:** Convex scales reads horizontally. Fetching a single user document is effectively instant up to millions of users.
* **Writes:** We only write to `users` during:
    1.  Onboarding (once).
    2.  Subscription changes (rare).
    3.  Settings updates (rare).
    *This is highly scalable.*
* **Daily Spark (Cron Job):**
    * We query `users.withIndex("by_subscription_status", "active")`.
    * Since all data (including birth chart) is on the user record, the cron job does **not** need to perform N+1 queries. It just iterates and generates.

---

### Security & Roles
* **Role-Based Access Control (RBAC):** Simple `role` field (`user` | `admin`).
* **Feature Flags:** `featureFlags` object allows us to enable "beta" features (like the Oracle Voice Mode) for specific users without deploying new code.