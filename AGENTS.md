# AGENTS.md - stars-guide

State of the art astrology education web app at stars.guide. The main product surface is the Oracle AI chat.

## Must Follow

- Use `vp` for package commands and dependency work. Do not use npm/yarn for installs.
- Do not run `vp dev`, `vp build`, `vp deploy`, `vp preview`, `vp lint`, or `vp check` unless the user asks.
- Do not edit generated/build output: `convex/_generated/`, `env.d.ts`, `.next/`, `.open-next/`, `.wrangler/`, `tsconfig.tsbuildinfo`.
- Do not edit lockfiles unless the task intentionally changes dependencies.
- Convex actions cannot use `ctx.db`; use `ctx.runQuery` / `ctx.runMutation`.
- Keep Oracle safety rules hardcoded and server-enforced. Admin settings must not be able to override crisis/safety behavior.
- Use shadcn-ui components for UI elements.

## Stack Snapshot

- Next.js App Router, React 19, Tailwind v4, shadcn/Radix, motion.
- Convex for backend, database, auth, actions, crons, and HTTP endpoints.
- `@convex-dev/auth` with email and Google One Tap, X OAuth and Facebook OAuth.
- Astrology calculations use `astronomy-engine` plus local astrology modules.
- Cloudflare Workers deploy through `@opennextjs/cloudflare`.
- Oracle LLM routing is multi-provider, configured through Convex/admin settings.

## Where To Look First

- Oracle UI routes: `src/app/(app)/oracle/`
- Oracle UI components: `src/components/oracle/`
- Oracle backend: `convex/oracle/`
- Oracle prompt, feature, safety, and provider client logic: `src/lib/oracle/` plus compatibility re-exports in `lib/oracle/`
- Oracle docs: `docs/oracle/README.md` and `docs/oracle/00-MASTER-WIRING-GUIDE.md`
- Auth: `convex/auth.ts`, `convex/auth/`, `src/app/(auth)/`
- Journal: `convex/journal/`, `src/app/(app)/journal/`
- Horoscopes: `convex/horoscopes/`, `src/app/(public)/horoscopes/`
- Learn/Astrology 101: `src/app/(public)/learn/`, `src/components/learn/`
- Admin tools: `src/app/(admin)/admin/`
- Emails: `emails/`, `convex/email/`, `convex/emails/`

## App Route Groups

- `src/app/(public)/`: marketing/public pages, learn, blog, pricing, horoscopes, profiles, legal.
- `src/app/(app)/`: authenticated product app, Oracle, journal, dashboard/settings shell.
- `src/app/(admin)/`: admin panels and operational tools.
- `src/app/(auth)/`: sign in, sign up, password flows.
- `src/app/(standalone)/`: onboarding and invite flows.
- `src/app/api/`: Next route handlers.

## Oracle Mental Model

- Main LLM action: `convex/oracle/llm.ts` (`invokeOracle`).
- Sessions/messages/quota/settings live in `convex/oracle/sessions.ts`, `quota.ts`, and `settings.ts`.
- Provider fallback/routing lives in `convex/oracle/providerRouter.ts` plus provider config from admin settings.
- Prompt assembly is pipeline-driven inside `invokeOracle`; pipeline definitions live under `src/lib/oracle/pipelines/`.
- Intent classification starts in `src/lib/oracle/intentRouter.ts`.
- Feature definitions and gating live in `src/lib/oracle/features.ts` and `src/lib/oracle/featureContext.ts`.
- Safety/crisis detection lives in `lib/oracle/safetyRules.ts` and `lib/oracle/responseSafety.ts`.
- Birth chart, synastry, journal recall, and binaural beats are feature/pipeline concepts. Binaural beats can bypass the LLM path.
- Birth data is pipeline-gated: inject it only when a pipeline declares it needs birth data.
- Journal context is both pipeline-gated and consent-gated; enforce this on the server.
- Synastry uses role/name-based language, not "Chart A" / "Chart B" in user-facing output.
- Admin observability is split between the live Oracle debug panel and `/admin/oracle/debug`.

## Convex Rules

- Queries and mutations can use `ctx.db`.
- Actions cannot use `ctx.db` directly.
- Auth `authorize` runs in action context; use `ctx.runMutation`, not `ctx.db`.
- Convex index names must match schema exactly. Auth lookups use `providerAndAccountId`, not `provider_accountId`.
- Keep server-authoritative checks on the server: quota, safety, journal consent, admin authorization, and prompt assembly.

## Build And Deploy Notes

- Standard Next build: `vp build`.
- Cloudflare build/deploy path: `opennextjs-cloudflare build` / `vp deploy`.
- Cloudflare deploys need OpenNext output, not only a plain Next build.
- Production config is split between `.env.local` for local development and `wrangler.jsonc` vars for Worker deploys.

## Repo Conventions

- TypeScript strict; avoid `any` unless there is a narrow reason.
- shadcn-ui primitives live in `src/components/ui/`.
- Page-local React pieces should go in route-local `_components/` folders when the route already uses that pattern.
- Shared frontend/client logic goes in `lib/`.
- Shared Convex/server logic goes in `convex/lib/`.
- Keep large architecture explanations in `docs/`; keep this file short and navigational.

## Known Pitfalls

- Google One Tap GIS uses `isNotDisplayed()`, not `isNotDisplayedMoment()`.
- The README is still mostly Cloudflare starter text; prefer this file, `package.json`, and `docs/` for project-specific guidance.
- Some older Oracle docs may reference pre-route-group paths or `src/lib/oracle`; verify against current files before editing.
