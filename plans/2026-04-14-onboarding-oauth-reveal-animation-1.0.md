# Onboarding Flow Enhancement: OAuth + Reveal Animation for "Birth Chart" Path

## Objective

When an unauthenticated user clicks "Birth Chart" in the navbar and completes the birth data collection (DOB, location, time), they currently proceed through email → password → direct redirect to `/dashboard` **without seeing the beautiful Sun/Moon/Rising reveal animation**. This plan adds:

1. **OAuth options** (Google, Facebook, X) to the email collection step (step 8)
2. **Conditional password step** — skipped when OAuth is chosen
3. **The reveal animation** (RevealSignCards for Sun/Moon/Rising) after account creation, regardless of auth method
4. **"Enter the Sanctuary" button** that redirects to `/dashboard`

---

## Current Flow Analysis

### Traditional Sign-Up Flow (works correctly)
`/sign-up` → email+password or OAuth → `/onboarding` → steps 1-7 (birth data + calculation) → **authenticated** → reveal animation shown in `CalculationStep` → "Enter the Sanctuary" → `/dashboard`

### Birth Chart Navbar Flow (broken)
`/onboarding` (unauthenticated) → steps 1-6 (birth data) → step 7 (calculates, but **skips animation** because unauthenticated) → step 8 (email only, **no OAuth**) → step 9 (password) → account created → **hard redirect to `/dashboard`**, no animation

### Step Mapping (current)
| Step | Component | Description |
|------|-----------|-------------|
| 1 | `BirthDateStep` | Date of birth |
| 2 | `BirthLocationStep` | Birth location |
| 3 | `TimeCheckStep` | Do you know your birth time? |
| 4 | `BirthTimeStep` | Birth time input |
| 5 | `DetectiveStepOne` | Personality Q (if time unknown) |
| 6 | `DetectiveStepTwo` | More personality Qs |
| 7 | `CalculationStep` | Calculates signs; shows animation **only if authenticated**; auto-advances if not |
| 8 | `EmailStep` | Email input only (**no OAuth**) |
| 9 | `PasswordStep` | Password + account creation → redirect to `/dashboard` |

---

## Implementation Plan

### Phase 1: Update Onboarding Store (`src/store/use-onboarding-store.ts`)

- [x] **1.1. Add `step` to the `partialize` config** so it persists across OAuth redirects. Currently `step` resets to 1 on page reload/OAuth return, which breaks the flow. Add `step: state.step` to the `partialize` object at line 88-96.

- [x] **1.2. Add `authMethod` field to the store state** — type `'email' | 'oauth' | null`, default `null`. This tracks which auth path the user chose so the flow can branch correctly. Add `authMethod` to the interface, initial state, a `setAuthMethod` action, and include it in `partialize`.

- [x] **1.3. Update `useOnboardingProgress`** to include case 10 (new reveal step) — set progress to 100 for step 10 (alongside existing steps 7-9 at line 121-125).

### Phase 2: Modify EmailStep — Add OAuth Buttons (`src/app/onboarding/_components/steps/email-step.tsx`)

- [x] **2.1. Import OAuth icons and `useAuthActions`** — add `FcGoogle` from `react-icons/fc`, `FaXTwitter` from `react-icons/fa6`, `FaFacebook` from `react-icons/fa`, `useAuthActions` from `@convex-dev/auth/react`, and `Loader2` from `lucide-react`.

- [x] **2.2. Add OAuth button state variables** — `isGoogleLoading`, `isTwitterLoading`, `isFacebookLoading` local state, plus destructure `setAuthMethod` and `setStep` from the onboarding store.

- [x] **2.3. Create OAuth handler functions** (`onGoogleSignIn`, `onTwitterSignIn`, `onFacebookSignIn`). Each handler must:
  - Set `authMethod: 'oauth'` in the store
  - Set `step: 10` in the store (so after OAuth redirect back, user lands on the reveal step)
  - Call `signIn("provider", { redirectTo: "/onboarding" })`
  - Handle errors with `toast.error`

- [x] **2.4. Add OAuth buttons to the JSX** — insert three OAuth buttons (Google, Facebook, X) **above** the email input, matching the styling from `src/app/(auth)/sign-up/sign-up-form.tsx:126-165`. Add a divider "Or save with email" between OAuth buttons and the email input field.

- [x] **2.5. Disable OAuth buttons while any auth is loading** — mirror the disabled pattern from the sign-up form (disable all OAuth buttons if any one is loading or if email submit is happening).

### Phase 3: Modify PasswordStep — Advance to Reveal Instead of Redirect (`src/app/onboarding/_components/steps/password-step.tsx`)

- [x] **3.1. Change post-signup behavior** — in `handleFinalize` (line 28-53), after successful `signIn("password", ...)`, instead of `router.push("/dashboard")`, call `setStep(10)` to advance to the new reveal step. Remove the `reset()` call here (it will be called in the reveal step instead).

- [x] **3.2. Set `authMethod: 'email'`** — before or after the signIn call, set `authMethod: 'email'` in the store so the reveal step knows the auth path taken.

### Phase 4: Create RevealStep — New Step 10 Component

- [x] **4.1. Create `src/app/onboarding/_components/steps/reveal-step.tsx`** — a new component that shows the Sun/Moon/Rising sign reveal animation.

- [x] **4.2. Extract the reveal UI from `CalculationStep`** — the reveal section of `src/app/onboarding/_components/steps/calculation-step.tsx:122-217` (the non-calculating return block) should be replicated in RevealStep. This includes:
  - The "Your Cosmic Blueprint is Ready" heading
  - The 3-column grid of `RevealSignCard` components (Sun, Moon, Rising)
  - The detective report section (if `birthTimeKnown` is false)
  - The "Enter the Sanctuary" button

- [x] **4.3. Add authentication + data saving logic** — on mount, the RevealStep must:
  - Check if user is authenticated (via `useUserStore`)
  - If authenticated AND birthData not yet saved to DB → call `updateBirthData` mutation with `calculatedSigns`
  - If NOT authenticated → redirect back to step 8 (edge case: shouldn't normally happen)
  - Use `useUserStore` to check if `user.birthData` already exists to avoid double-saving

- [x] **4.4. "Enter the Sanctuary" handler** — on click, call `reset()` on the onboarding store and `router.push("/dashboard")`, exactly as `CalculationStep` does at line 91-94.

- [x] **4.5. Add a brief transition/loading state** — show a short (1-2 second) loading animation before the reveal cards appear, giving a smooth transition feel. Use a local `isReady` state with a setTimeout, similar to how CalculationStep uses `isCalculating`.

### Phase 5: Update Onboarding Page (`src/app/onboarding/page.tsx`)

- [x] **5.1. Import the new RevealStep** component.

- [x] **5.2. Add case 10 to the switch statement** (line 39-51) — `case 10: return <RevealStep />`.

- [x] **5.3. Update the progress bar visibility condition** — the current condition at line 56 (`step > 0 && step < 7`) should remain as-is since steps 7-10 should all hide the progress bar. Step 10 is already excluded from the progress bar display range.

### Phase 6: Handle OAuth Return Edge Case

- [x] **6.1. Add a guard in the onboarding page** — add a `useEffect` that detects the OAuth return scenario: if user is authenticated AND `calculatedSigns` exists in the store AND step is 10, do nothing (let RevealStep handle it). If step is 8 but user is authenticated AND `authMethod === 'oauth'`, advance to step 10.

- [x] **6.2. Ensure the existing redirect guard at line 30-34 still works** — `user?.birthData && step !== 7` should also exclude step 10: change to `step !== 7 && step !== 10` so the reveal animation isn't interrupted by a premature redirect to `/dashboard`.

---

## New Step Flow (after implementation)

| Step | Component | Description |
|------|-----------|-------------|
| 1 | `BirthDateStep` | Date of birth |
| 2 | `BirthLocationStep` | Birth location |
| 3 | `TimeCheckStep` | Do you know your birth time? |
| 4 | `BirthTimeStep` | Birth time input |
| 5 | `DetectiveStepOne` | Personality Q (if time unknown) |
| 6 | `DetectiveStepTwo` | More personality Qs |
| 7 | `CalculationStep` | Calculates signs; if authenticated → shows animation + save; if not → advance to 8 |
| 8 | `EmailStep` | **OAuth buttons (Google, Facebook, X) + email input** |
| 9 | `PasswordStep` | Password + account creation → **advance to step 10** |
| 10 | `RevealStep` | **NEW** — Saves birthData to DB, shows Sun/Moon/Rising animation, "Enter the Sanctuary" → `/dashboard` |

### Flow branching at step 8:
```
Step 8 (EmailStep)
├── User clicks OAuth → set step=10, authMethod='oauth' → OAuth redirect → return to step 10 (RevealStep)
└── User enters email → step 9 (PasswordStep)
    └── User enters password → account created → step 10 (RevealStep)
```

---

## Verification Criteria

- [ ] Unauthenticated user clicks "Birth Chart" in navbar → completes birth data steps → sees email step with OAuth buttons
- [ ] Clicking Google/Facebook/X OAuth button authenticates user and returns to the reveal animation (step 10)
- [ ] Choosing email path → entering email → entering password → shows reveal animation (step 10) instead of hard-redirecting to dashboard
- [ ] Reveal animation shows Sun, Moon, and Rising sign cards with the same staggered animation as the authenticated flow
- [ ] "Enter the Sanctuary" button redirects to `/dashboard`
- [ ] Birth data is correctly saved to the database for both OAuth and email paths
- [ ] Traditional sign-up flow (`/sign-up` → onboarding) still works unchanged
- [ ] If user returns from OAuth but authentication failed, they are redirected back to step 8
- [ ] Progress bar is hidden during steps 7-10
- [ ] Detective report shows for users who didn't know their birth time

---

## Potential Risks and Mitigations

1. **OAuth redirect loses component state**
   - **Risk**: When user goes to OAuth provider and returns, React component state is lost. Only persisted Zustand state survives.
   - **Mitigation**: We persist `step`, `authMethod`, `calculatedSigns`, and all birth data in the Zustand store's `partialize` config. The RevealStep reads from the store, not from local component state.

2. **Double-saving birthData**
   - **Risk**: If the user somehow lands on step 10 twice (e.g., browser back button), birthData could be saved twice.
   - **Mitigation**: RevealStep checks `user.birthData` before calling `updateBirthData`. If already saved, skip the mutation.

3. **Step persistence side effects**
   - **Risk**: Persisting `step` means if a user abandons onboarding mid-way and returns later, they'll resume at the same step, which might be confusing.
   - **Mitigation**: This is actually desirable behavior — it prevents data loss. The existing birth data fields are already persisted for this reason.

4. **OAuth provider account already exists**
   - **Risk**: User clicks Google OAuth but already has an account. OAuth signs them into their existing account which may already have birthData.
   - **Mitigation**: The onboarding page's existing redirect guard (`user?.birthData && step !== 7 && step !== 10`) will redirect them to `/dashboard` if they already have birthData.

5. **Race condition between auth state and step rendering**
   - **Risk**: After OAuth return, the auth state might not be ready when RevealStep mounts.
   - **Mitigation**: RevealStep should wait for `isAuthenticated()` to be true before attempting to save. Show a loading state while waiting. If auth check fails after a timeout, redirect back to step 8.

---

## Alternative Approaches

1. **Reuse CalculationStep for step 10 instead of creating RevealStep**: We could modify CalculationStep to handle both the initial calculation (step 7) and the post-auth reveal (step 10). However, this would add complexity to an already complex component with dual responsibilities. A separate RevealStep is cleaner and more maintainable.

2. **Redirect OAuth users back to step 7 instead of step 10**: Instead of creating a new step, set step to 7 after OAuth return and let CalculationStep re-run. This would show the calculation loading animation again (redundant) and requires the component to handle the "already calculated" case. More complex with worse UX.

3. **Show the reveal inline in PasswordStep after account creation**: Instead of a new step, show the animation directly in PasswordStep after successful signup. This couples the reveal logic to the password component and doesn't handle the OAuth path. Less clean separation of concerns.
