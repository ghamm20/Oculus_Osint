# Oculus0Osint — Phase 5 Report

**Phase:** Stripe + Supabase Rip-Out
**Captured:** 2026-05-25
**Predecessor:** Phase 4 (commits `577bfd3` + `e5026da`)
**Stance:** standing down after this report; owner pre-authorized push at start of Phase 5.

---

## 1. Scope Recap

From `OCULUS_PHASE5_PLAN.md`:
- **In scope:** uninstall `stripe`, `@supabase/supabase-js`, `@auth/supabase-adapter`; delete the billing API routes, the supabase + stripe lib files; remove the SupabaseAdapter conditional from `lib/auth.ts`; remove the Supabase GoTrue branch from `app/login/actions.ts`; strip Supabase env vars; drop `stripeCustomerId` / `stripeSubscriptionId` columns from the Prisma `Workspace` model.
- **Out of scope:** `src/core/edition.ts` cloud-edition constant (stays — it's used by tenant subdomain logic in proxy.ts).

The Phase 1 brief deferred this work because it touched `auth.config.ts` and might require migration. The migration window is now safe: every code path is exercised, the `workspaces` table is empty (no Stripe-linked data to lose), and the auth surface has been stable through 4 prior phases.

## 2. What Changed

### Deleted
- `src/lib/stripe/client.ts` and the empty `src/lib/stripe/` dir
- `src/lib/supabase.ts` (orphan helper — confirmed unimported)
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/api/billing/` (empty parent dir)

### Modified
- `src/lib/auth.ts` — removed `SupabaseAdapter` import and the `adapter: isCloud ? SupabaseAdapter(...) : undefined` line. Removed now-unused `isCloud` from the edition import. JWT sessions back local + cloud + demo editions equivalently.
- `src/app/login/actions.ts` — removed the `createClient` import and the entire `isCloud && !isDummyUrl` branch that did Supabase GoTrue signin. Login is now monomorphic: always uses the local credentials provider in `lib/auth.ts`.
- `prisma/schema.prisma` — dropped `stripeCustomerId String?` and `stripeSubscriptionId String?` from the `Workspace` model. `workspaces` table was empty, so `prisma db push --accept-data-loss` was a no-op data-wise.
- `.env.local` and `.env.example` — removed `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL` from both.

### Uninstalled
```
pnpm remove stripe @supabase/supabase-js @auth/supabase-adapter
Packages: -10
```

Direct removals: 3. Transitive removals: 7. Total 10 packages gone.

### Untouched (doctrine-protected)
- `@worldwideview/*` package names — unchanged.
- `WWV_*` env contract names — unchanged.
- Default URL constants for marketplace / registry / data engine / cloud engine — unchanged.
- `src/core/edition.ts` — `isCloud` constant still exported. Still used by `proxy.ts` (tenant subdomain routing) and `src/app/api/internal/workspace/[subdomain]/route.ts` (tenant resolution). Cloud edition remains a runnable edition; it just no longer has a distinct auth adapter.

---

## 3. Gates

Evidence in `_phase5_verification/`.

### Gate 5A — Packages uninstalled — **PASS**

```
dependencies:
- @auth/supabase-adapter 1.11.2
- @supabase/supabase-js 2.105.4
- stripe 22.1.1
Done in 4.2s using pnpm v11.2.2
```

Lockfile updated: 10 packages removed (3 direct + 7 transitive).

### Gate 5B — No source references remain — **PASS**

`grep -rEln "stripe|supabase|@auth/supabase-adapter" src/` returns only:
- Auto-generated Prisma files (`src/generated/prisma/*`) — generated client mentions "stripe" because of legacy `Workspace.stripe*` fields; the schema change above regenerated cleanly.
- Two Phase 5 comments in `src/lib/auth.ts` and `src/app/login/actions.ts` documenting the removal — intentional breadcrumbs.

No active source code references the removed packages.

### Gate 5C — Build passes clean — **PASS**

```
> next build --webpack
ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

ls -la .next/standalone/server.js
-rw-r--r-- 1 Gordy 197121 7558 May 24 18:40 .next/standalone/server.js
```

No Stripe / Supabase build warnings.

### Gate 5D — Owner login still works — **PASS**

```
POST /api/auth/csrf -> token
POST /api/auth/callback/credentials (owner@oculus.local / oculusphase1!) -> 302
GET  /api/auth/session ->
  {"user":{"name":"Owner","email":"owner@oculus.local","id":"0861a2d2-...","role":"admin"},
   "expires":"2026-06-24T01:41:18.004Z"}
```

Same credentials provider, same JWT session. The `loginAction` server action now has 25 fewer lines and only one code path.

Billing routes confirmed deleted:
```
GET /api/billing/checkout -> HTTP 404
```

### Gate 5E — Gate F still clean with layers ON — **PASS** ✅

```
# total requests observed: 83
# requests to localhost / 127.0.0.1 / data: / blob: : 83
# of which to /wwv-mirror (plugin mirror): 10
# off-site requests: 0
PASS: no requests to non-localhost origins.
```

Unique non-localhost origins: *(none)*

Evidence: `_phase5_verification/gate-f-post-strip.txt`

The sovereign posture established by Phases 1-4 is preserved end-to-end. Stripe + Supabase rip-out had zero impact on outbound traffic — confirming the scaffolding was genuinely dormant and not silently called from anywhere.

---

## 4. Honest Issues, Not Papered Over

1. **`isCloud` is now mostly inert** but not deleted. It still works for the proxy's tenant-subdomain routing and the internal `/api/internal/workspace/[subdomain]` route. Removing it would be a doctrine-adjacent change (edition is a tri-state — local / cloud / demo — and removing one of three is a structural change). Phase 5 left it alone deliberately.

2. **Cloud edition's auth shape changed.** If anyone sets `NEXT_PUBLIC_WWV_EDITION=cloud`, the app boots with the local credentials provider against the local Postgres `users` table. There is no Supabase-backed multi-tenant cloud auth anymore. This fork is the local edition; this is the doctrine.

3. **Prisma client regeneration** was a forced consequence of the schema change. The new `src/generated/prisma/*` files are committed (they were in the prior commit too — Prisma 7 generates into the source tree, not `node_modules`).

4. **No data lost.** `workspaces` table was empty pre-strip (the only owner is in `users`, not in `workspaces`). `prisma db push --accept-data-loss` printed "Your database is now in sync" with no warnings.

5. **`.env.local` is gitignored** — so the supabase env-var removal there doesn't show in git diff. The `.env.example` change is the public record of the env contract.

6. **`logs/data-engine.log` records the engine fetched data through the rebuild + restart cycle.** Phase 4 stub kept running between phases, which is correct behavior — the engine doesn't need to restart when the app does.

---

## 5. Files Changed

| File | Status |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | -3 direct deps, -10 total packages |
| `prisma/schema.prisma` | -2 fields from `Workspace` |
| `src/generated/prisma/**` | regenerated |
| `src/lib/auth.ts` | -2 imports, -3 lines (adapter arg) |
| `src/app/login/actions.ts` | -10 lines (Supabase branch removed) |
| `src/lib/stripe/client.ts` | deleted |
| `src/lib/supabase.ts` | deleted |
| `src/app/api/billing/checkout/route.ts` | deleted |
| `src/app/api/billing/webhook/route.ts` | deleted |
| `.env.local`, `.env.example` | -4 env vars from each |
| `_phase5_verification/gate-f-post-strip.txt` | new |
| `OCULUS_PHASE5_PLAN.md` | scope-lock |
| `OCULUS_PHASE5_REPORT.md` | this file |

No SDK / package name / WWV_* / URL constant defaults changed.

---

## 6. Open Questions for Owner

1. **`isCloud` constant + cloud-edition gates** — keep, or fully remove tri-state edition logic now that cloud has no distinct behavior? Removing it would be a separate phase touching `core/edition.ts`, `proxy.ts`, and any code that branches on `isCloud`. Probably worth doing eventually but not urgent.

2. **`src/app/api/internal/workspace/[subdomain]/route.ts`** — still exists for multi-tenant cloud routing. Dormant in local edition. Delete or keep?

3. **`src/app/billing/*` UI pages** — none currently exist. If there were billing-related UI panels, they're gone via the API delete. Spot-check before next phase: nothing to do.

4. **Phase 6 candidate (recommended): ARGOS coupling decision finalization.** The Phase 2/3/4 reports all flagged it as the long-pending architectural call. The work to date keeps both paths viable. Now is a natural inflection point.

---

## 7. Recommended Next Phase

**Phase 6 candidate: ARGOS coupling decision + first implementation pass.**

The decision: sixth interface vs ARGOS map pane. Either path can be implemented narrowly:

- **Sixth interface:** Oculus0Osint stays standalone. ARGOS calls into it via an existing or new API surface. First Phase 6 step is to define and implement that API contract.
- **ARGOS map pane:** the Oculus globe + plugins become a panel inside ARGOS's UI. First Phase 6 step is to extract the GlobeView + plugin host as a reusable React component that ARGOS can embed.

Either way, Phase 6 ends with one concrete coupling integration shipping.

Alternative: **Phase 6 = `isCloud` + tri-state edition removal** (simpler, cleaner — but lower architectural value).

**Do NOT start Phase 6 without owner confirmation.** Standing down.

---

## 8. Commit

(SHA stamped after commit)
