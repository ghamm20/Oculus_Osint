# Oculus0Osint — Phase 5 Plan

**Phase:** Stripe + Supabase Rip-Out
**Status:** Plan (scope-lock before execution)
**Predecessor:** Phase 4 (commits `577bfd3` + `e5026da`)

---

## Why this phase

The Phase 1 brief deferred Stripe + Supabase removal because they "touch `auth.config.ts` and may require migration." Phases 1-4 stabilized the local-edition auth surface (credentials → JWT → Postgres) and proved everything works without ever exercising the cloud / billing paths. Now is the safe window to delete the dormant scaffolding.

What stays sovereign by removing them:
- **Smaller attack surface.** Three external SDKs and ~10 npm dependencies disappear.
- **Build-time guarantee** there is no path by which Stripe or Supabase could be invoked, even if env vars were misconfigured.
- **Cleaner code** — every `isCloud ? supabase : credentials` branch goes away; auth becomes monomorphic.
- **Smaller `package.json`.** `stripe@22.x` and `@supabase/supabase-js@2.x` are non-trivial dependency trees.

What we don't lose:
- Cloud edition (`NEXT_PUBLIC_WWV_EDITION=cloud`) gates were already untested in this fork. Removing the Supabase-branch from `lib/auth.ts` makes cloud mode boot with no auth adapter, which is exactly what `local` mode does. Cloud-mode behavior degrades to "same as local but with edition flag set" — acceptable because the fork is the local edition, not the cloud edition.

## Doctrine surface

This phase **does modify the auth code path** (which was flagged "may require migration" in the Phase 1 brief). But it does NOT modify:
- `@worldwideview/*` SDK identifiers.
- `WWV_*` env contract names.
- Default URL constants for the marketplace, registry, or data engine.
- The plugin / data flow stack established in Phases 2-4.

The auth.ts surface change is local-only: the function signature of `signIn / signOut / auth` is unchanged, only the constructor argument to NextAuth() is.

## Scope (in)

1. **Uninstall packages**
   - `stripe`
   - `@supabase/supabase-js`
   - `@auth/supabase-adapter`

2. **Delete files**
   - `src/lib/stripe/client.ts` (and the empty `src/lib/stripe/` dir)
   - `src/lib/supabase.ts` (orphan — not imported anywhere)
   - `src/app/api/billing/checkout/route.ts`
   - `src/app/api/billing/webhook/route.ts`
   - `src/app/api/billing/` (parent dir if empty after)

3. **Modify**
   - `src/lib/auth.ts` — remove `SupabaseAdapter` import + the `adapter: isCloud ? ... : undefined` line. Drop the unused `isCloud` import if it's no longer needed elsewhere in that file.
   - `src/app/login/actions.ts` — remove the `createClient` import + the entire `isCloud && !isDummyUrl` branch. Always use the local credentials provider.
   - `.env.local`, `.env.example` — remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`. Stripe vars (`STRIPE_*`) don't currently exist in either file, so no changes there.

## Scope (out)

- `src/core/edition.ts` — the `isCloud` constant stays as-is. Cloud is one of three valid editions; removing it would be a doctrine-adjacent change. The branch just no longer has effect on auth.
- `package.json` workspace, prisma schema, edition gating in other places. Cloud mode remains a runnable edition; it just stops having distinct auth.
- Stripe webhook signature verification, billing UI components — none exist, nothing to clean.

## Gates

| Gate | Subject | Pass condition |
| --- | --- | --- |
| **5A** | Packages uninstalled | `pnpm list stripe @supabase/supabase-js @auth/supabase-adapter` shows nothing. Lockfile diff reflects the removal. |
| **5B** | No source references to removed packages | `grep -rln 'stripe\|supabase\|@auth/supabase-adapter' src/` returns nothing (except possibly the `isCloud` constant which is unrelated). |
| **5C** | Build passes clean | `corepack pnpm build` succeeds, `.next/standalone/server.js` exists, no Stripe/Supabase warnings. |
| **5D** | Owner login still works | Authenticated session via the existing local credentials flow returns a valid session. Same code path as Phases 1-4. |
| **5E** | Gate F still clean | Headless audit with layers ON shows zero off-site requests (same shape as Phase 4 Gate 4E). |

## Files touched (estimate)

| File | Change |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | -3 deps (and their tree) |
| `src/lib/stripe/client.ts` | delete |
| `src/lib/supabase.ts` | delete |
| `src/app/api/billing/**` | delete (entire dir) |
| `src/lib/auth.ts` | -2 lines (import + adapter arg) |
| `src/app/login/actions.ts` | -10 lines (Supabase branch + import) |
| `.env.local`, `.env.example` | -4 supabase env vars from each |
| `_phase5_verification/` | gate evidence |
| `OCULUS_PHASE5_REPORT.md` | new |

No SDK / package name / env contract / URL constant defaults changed.

## Risk register

1. **Cloud-edition behavior changes.** If anyone runs `NEXT_PUBLIC_WWV_EDITION=cloud` after Phase 5, the app boots with the local credentials provider instead of Supabase. They'd be able to log in via the local `users` table only — which is fine as long as no production cloud instance exists (this fork's doctrine is local).

2. **`isCloud` constant becomes mostly inert.** It still exists, still flips on the env var. Removing its consumers means fewer code paths gated on it. The constant itself stays; it's used by `proxy.ts` for the tenant-subdomain logic which is unrelated.

3. **`pnpm remove` may transitively unhook deps used by other code.** Unlikely (these are leaf packages) but the build verification catches it.

4. **The `src/lib/supabase.ts` helper is unused — confirmed by inventory.** Removing it has no impact.

## Deliverable

- `OCULUS_PHASE5_REPORT.md` mirroring the Phase 1-4 report shape.
- `_phase5_verification/` with gate evidence (rebuild output, network audit).
- Commits on `main`; will be pushed since the owner pre-authorized for Phase 5.

---

Executing.
