# Oculus0Osint — Phase 1 Report

**Phase:** Local Edition Lockdown
**Captured:** 2026-05-24
**Working tree:** `C:\AI\OCULUSBOUND\Oculus-osint-main`
**Operator:** automated agent under owner direction
**Stance:** stand down after this report; await owner go-ahead before any follow-on phase.

---

## 1. Pre-flight Inventory

| Item | Finding | Action |
| --- | --- | --- |
| Branch | `main`, tracking `origin/main`, clean tree | none |
| Head commit before Phase 1 | `9b61189` "Clarify ARGOS video feed selection" | none |
| `.env.local` NEXT_PUBLIC_WWV_EDITION | `local` ✅ | confirmed |
| `.env` NEXT_PUBLIC_WWV_EDITION | `local` ✅ | confirmed |
| Launch script edition | `launch-oculus0osint.ps1` forced `demo` | **fixed → `local`** |
| Launch script port | `3011` | **fixed → `3010`** (doctrine: 3010 sticky) |
| Docker compose port | 3000 (container 3000) | left as-is — internal contract |
| pnpm allowBuilds | `@prisma/engines`, `@sentry/cli`, `esbuild`, `prisma`, `protobufjs`, `sharp` | **removed `@sentry/cli`** |
| approve-builds queue | empty (all decisions in `pnpm-workspace.yaml`) | confirmed |
| Outbound-network deps in `package.json` | `@sentry/nextjs ^10.52.0`, `@vercel/analytics ^1.6.1`, `stripe ^22.1.1`, `@supabase/supabase-js ^2.105.4`, `@auth/supabase-adapter ^1.11.2` | Sentry + Vercel removed; Stripe + Supabase deferred per scope |

Full pre-flight in [`_phase1_verification/preflight-inventory.txt`](_phase1_verification/preflight-inventory.txt).

> **Note on `protobufjs`:** the doctrine list named only `@prisma/engines, prisma, sharp, esbuild`. `protobufjs` is a transitive build approval pulled in by `cesium 1.141 → @cesium/engine → protobufjs`. Removed approval would block Cesium native install. Kept and called out here rather than silently retained.

---

## 2. Postgres Setup

Docker Desktop already present (`Docker version 29.4.3, build 055a478`).

```powershell
docker compose up -d db
```

- Image `postgres:15-alpine` pulled fresh
- Container `oculus-osint-main-db-1` started, healthcheck reports `(healthy)`
- Mapped to host `0.0.0.0:5432`
- Volume `oculus-osint-main_postgres-data` created
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/worldwideview` lives in `.env.local`; **no credentials committed to git** (`.env.local` is in `.gitignore`)

Verified with a `psql` round-trip:

```
PostgreSQL 15.18 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
```

---

## 3. Prisma Initialization

```bash
corepack pnpm exec prisma generate
corepack pnpm exec prisma db push --accept-data-loss
```

Result: schema applied to `worldwideview` database. 16 tables created (`anomalies, correlations, favorites, installed_plugins, operator_briefs, provider_health, providers, replay_updates, sensor_entities, sensor_events, settings, streams, user_streams, users, workspace_members, workspaces`).

Prisma client emitted to `src/generated/prisma/`.

---

## 4. Owner Account

Edition `local` confirmed in `.env.local` and `.env`. The Next.js standalone server **does not auto-load `.env.local`**; that was the root cause of the Postgres-unreachable errors in `[setup-status]` during the first launch attempt. Fix landed in [`scripts/start-standalone.mjs`](scripts/start-standalone.mjs) — the script now manually loads `.env.local` then `.env` with `.env.local` taking precedence, matching Next dev-server semantics. Owner should review.

A second related fix: NextAuth rejected the `0.0.0.0` host with `UntrustedHost`. Added `AUTH_TRUST_HOST=true` to `.env.local`. Standard self-host convention; documented in the file.

Owner account was provisioned via [`scripts/phase1-create-owner.mjs`](scripts/phase1-create-owner.mjs), which uses the same code path as the `/setup` server action (`bcryptjs.hashSync(password, 12)` + `prisma.user.create`). The /setup UI was reached and rendered correctly; the provisioning was scripted because the controlled-input form did not retain values when filled via the Preview MCP automation (UI quirk, not a server bug — the form works for an interactive user).

```
Created owner: owner@oculus.local (id=0861a2d2-0e30-4e31-b990-fc9d8fce67f6, role=admin)
```

Subsequent NextAuth login via the credentials provider succeeded and issued a session cookie:

```json
{"user":{"name":"Owner","email":"owner@oculus.local","id":"0861a2d2-...","role":"admin"},
 "expires":"2026-06-23T21:55:02.266Z"}
```

`/api/auth/setup-status` reports `{"needsSetup":false,"edition":"local","pluginManagementEnabled":true}`. No orange demo banner present (verified in Gates A and B screenshots).

---

## 5. pnpm Build-Script Approvals

`pnpm-workspace.yaml` now lists only the four doctrine-approved scripts plus the Cesium-required `protobufjs`:

```yaml
allowBuilds:
  '@prisma/engines': true
  esbuild: true
  prisma: true
  protobufjs: true
  sharp: true
```

`@sentry/cli` is removed. Since `@sentry/nextjs` is uninstalled (see §6), `@sentry/cli` is no longer pulled at all — pnpm's approve-builds queue is empty.

---

## 6. Telemetry Strip

**Packages removed** (`corepack pnpm remove @sentry/nextjs @vercel/analytics` — 92 transitive packages dropped):

| Package | Before | After |
| --- | --- | --- |
| `@sentry/nextjs` | `^10.52.0` | removed |
| `@vercel/analytics` | `^1.6.1` | removed |

**Files deleted:**

- `src/sentry.client.config.ts`
- `src/sentry.server.config.ts`
- `src/sentry.edge.config.ts`
- `src/app/api/glitchtip-tunnel/route.ts` (entire folder)

**Files edited:**

- `next.config.ts` — dropped `withSentryConfig` import + wrapper; dropped Sentry `ignoreWarnings` rule; tightened CSP `script-src` (removed `analytics.worldwideview.dev`, `va.vercel-scripts.com`, `static.cloudflareinsights.com`)
- `src/instrumentation.ts` — replaced Sentry init with a no-op `register()` and `onRequestError()` stub
- `src/app/global-error.tsx` — dropped `Sentry.captureException`; pure Next.js error UI now
- `src/app/api/marketplace/load/route.ts` — replaced `Sentry.captureMessage` call with a structured `console.error`
- `src/app/layout.tsx` — dropped `<Analytics />` element, the `@vercel/analytics/next` import, and the conditional `analytics.worldwideview.dev` script

**Files intentionally not touched** (per doctrine):

- Stripe scaffolding — dormant unless env keys are set; ripping it out touches `auth.config.ts` and the migration path. Deferred.
- `@supabase/supabase-js`, `@auth/supabase-adapter` — same dormant-unless-keyed shape. Deferred.
- All `@worldwideview/*` package imports, `marketplace.worldwideview.dev` constants, `dataengine.worldwideview.dev` constants, `WWV_*` env names — compatibility contracts.

Build runs clean. `corepack pnpm build` produces a fresh `.next/standalone/server.js`. No Sentry/Vercel warnings.

---

## 7. Verification Gates

Evidence in [`_phase1_verification/`](_phase1_verification/).

### Gate A — Local edition boot — **PASS**

`http://localhost:3010/login` renders the login form. No "demo" banner. Title still "Oculus0Osint | Geospatial Intelligence". Logo, "Sign in to Oculus0Osint", "Enter your credentials to continue" — clean local-edition UI.

Evidence: [`gate-a-local-edition.png`](_phase1_verification/gate-a-local-edition.png)

### Gate B — Owner login works — **PASS**

Authenticated via the NextAuth credentials provider:
- POST `/api/auth/csrf` → token
- POST `/api/auth/callback/credentials` with `owner@oculus.local` / `oculusphase1!` → 302 redirect, session cookie issued
- GET `/api/auth/session` → returns user `Owner` with `role:"admin"`

Screenshot of the post-auth root shows the globe shell (Cesium initializing), the `OCULUS0OSINT GEOSPATIAL INTELLIGENCE` header chrome, the "Data layer status" sidebar, and the timeline rail. No demo banner. No demo language.

Evidence: [`gate-b-owner-auth.png`](_phase1_verification/gate-b-owner-auth.png)

### Gate C — Globe with at least 3 data layers enabled — **PASS**

Loaded the authenticated root, then clicked the layer-item toggles for `aviation`, `earthquake`, `wildfire`, and `camera` plugin categories via the same DOM affordances a user clicks. After settle, the sidebar reads **"Data layer status: 6 entities, 7 enabled"** and the right-side configuration pane shows the Weather Cameras Layer detail.

Note: the Cesium WebGL canvas hadn't fully repainted at the moment of capture (headless GL on Edge is slow to compose), but the entity markers are visible mid-globe and the active-layer counters are unambiguous in the sidebar. The data-layer state is the gate, not the WebGL frame, and the layers are demonstrably enabled.

Evidence: [`gate-c-globe-layers.png`](_phase1_verification/gate-c-globe-layers.png)

### Gate D — Oculus Analyst responds (Ollama online) — **PASS**

**Note on the local Ollama daemon:** the primary `ollama-windows.exe` on the host is running from `G:\USB-Uncensored-LLM-main\Shared\bin\` against models on `G:\` — a USB drive that is not currently mounted. `/api/tags` returns `mkdir G:\USB-Uncensored-LLM-main: The system cannot find the path specified` and chat calls fail with `model is required`.

To avoid disturbing the owner's primary Ollama process, Phase 1 launched a **sidecar Ollama on port 11500** from `$env:LOCALAPPDATA\Programs\Ollama\ollama.exe serve` with `OLLAMA_MODELS=$HOME\.ollama\models` (which contains `gemma2-2b-local:latest` and several other models, all functional). `.env.local` was updated to point `LOCAL_LLM_BASE_URL=http://127.0.0.1:11500` and `LOCAL_LLM_MODEL=gemma2-2b-local:latest`. The sidecar was killed after Gate E.

Send/response:

```
POST /api/assistant/chat  {"message":"reply with exactly: ping"}
→ 200 {"message":"ping","model":"gemma2-2b-local:latest","offline":false}

POST /api/assistant/chat  {"message":"Gate D verification: respond with the single word OK"}
→ 200 {"message":"OK","model":"gemma2-2b-local:latest","offline":false}
```

Audit log entry (newest line of `logs/assistant-audit.jsonl`):

```json
{"timestamp":"2026-05-24T21:56:54.827Z","route":"/api/assistant/chat",
 "baseUrl":"http://127.0.0.1:11500","model":"gemma2-2b-local:latest",
 "messages":[{"role":"user","content":"Gate D verification: respond with the single word OK"}],
 "status":"ok","response":"OK","durationMs":14244}
```

Evidence: [`gate-d-analyst-online.png`](_phase1_verification/gate-d-analyst-online.png), [`gate-d-audit.txt`](_phase1_verification/gate-d-audit.txt)

### Gate E — Ollama-offline handling — **PASS**

Killed the sidecar Ollama (`Stop-Process` on the port-11500 listener). Sent a ping; got a clean 503:

```
POST /api/assistant/chat  {"message":"Ollama offline check after Gate E screenshot"}
→ 503 {"error":"Ollama is offline or unreachable.","offline":true,
       "model":"gemma2-2b-local:latest","baseUrl":"http://127.0.0.1:11500"}
```

Audit log captured the failure with `status:"offline"` and `error:"fetch failed"`:

```json
{"timestamp":"2026-05-24T21:59:24.709Z","route":"/api/assistant/chat",
 "baseUrl":"http://127.0.0.1:11500","model":"gemma2-2b-local:latest",
 "messages":[{"role":"user","content":"Ollama offline check after Gate E screenshot"}],
 "status":"offline","error":"fetch failed","durationMs":236}
```

No hang, no crash, clean error surface. The Oculus Analyst panel screenshot shows the panel open with the input ready and the "Oculus Analyst standing by." prompt visible.

Evidence: [`gate-e-ollama-offline.png`](_phase1_verification/gate-e-ollama-offline.png), [`gate-e-audit.txt`](_phase1_verification/gate-e-audit.txt)

### Gate F — Zero outbound calls on initial load — **PARTIAL PASS / FAIL on broader target**

Captured every network request the headless Edge made while loading `http://localhost:3010/` as the authenticated owner. Edge was launched with `--disable-extensions` (the user's installed Adobe / Honey / ZoomInfo browser extensions were polluting the first attempt's audit).

Unique non-localhost origins observed:

| Origin | Why | Doctrine status |
| --- | --- | --- |
| `api.cesium.com` | Cesium Ion default token (terrain endpoint) | SDK contract — protected in Phase 1 |
| `dev.virtualearth.net` | Bing Maps metadata | SDK contract — protected in Phase 1 |
| `ecn.t{0..3}.tiles.virtualearth.net` | Bing Maps imagery tiles (~35 tile requests) | SDK contract — protected in Phase 1 |
| `unpkg.com` | Marketplace plugin loader (`@worldwideview/wwv-plugin-*` packages) | **WWV marketplace URL constant — explicitly protected** |

**Crucially absent**: Sentry, GlitchTip, Vercel Analytics, Cloudflare Insights, any `analytics.*` host. The Phase 1 telemetry-strip goal is **verified clean**.

The remaining off-site traffic is all imagery and marketplace plugin loading — exactly the SDK and marketplace compatibility contracts the doctrine says not to touch in this phase. Treating Gate F as a partial pass: telemetry-strip target met; sovereign-posture target not yet met (out of scope for Phase 1).

Evidence: [`gate-f-network.txt`](_phase1_verification/gate-f-network.txt)

### Gate G — Branding grep — **PASS**

66 raw `worldwideview|panoptis` hits across `src/`, `docs/`, `public/`. Zero `panoptis` hits.

Categories:

- **Doctrine-protected** (SDK identifiers, marketplace URLs, WS engine endpoints, JWT iss/aud values, tests of those constants) — must remain.
- **Dormant on local edition** — `src/components/timeline/Timeline.tsx:70` shows a "use your own instance" link only on demo edition; `src/proxy.ts:102` redirects only the `*.app.worldwideview.dev` apex hostname. Neither fires for local owners.
- **Documentation rewrite (deferred)** — `docs/*.md` tutorial prose still describes the upstream WWV ecosystem. Identifiers stay; prose should be re-branded in a docs-pass phase.
- **Non-user-facing internal** — `src/core/data/CacheLayer.ts:15` uses `worldwideview-cache` as the IndexedDB name; renaming would invalidate existing client caches. Defer.

No user-visible Oculus0Osint string still reads "WorldWideView" on local edition.

Evidence: [`gate-g-branding-grep.txt`](_phase1_verification/gate-g-branding-grep.txt)

---

## 8. Summary

| Gate | Subject | Result |
| --- | --- | --- |
| A | Local edition boot | ✅ PASS |
| B | Owner login works | ✅ PASS |
| C | Globe with ≥3 layers | ✅ PASS |
| D | Oculus Analyst (Ollama online) | ✅ PASS (sidecar Ollama; primary daemon is on a missing USB drive) |
| E | Ollama offline handling | ✅ PASS |
| F | Zero outbound calls | ⚠️ PARTIAL — telemetry-strip clean; SDK/marketplace contracts remain |
| G | Branding pass | ✅ PASS — no user-visible WWV strings on local edition |

The Phase 1 doctrine targets — **local edition lockdown** (Postgres + owner + no demo override + port 3010) and **telemetry strip** (Sentry + Vercel Analytics gone, no analytics outbound) — are met.

---

## 9. Honest Issues, Not Papered Over

1. **`scripts/start-standalone.mjs` now loads env files manually.**  Next.js standalone output does *not* load `.env` / `.env.local` at runtime, only at build time. Without this fix, `DATABASE_URL`, `AUTH_SECRET`, and the Ollama URL never reached the spawned server, and `[setup-status]` hung in a loop. The added loader matches Next dev-server precedence (`process.env > .env.local > .env`). Owner should sanity-check that loader.

2. **`AUTH_TRUST_HOST=true` is now in `.env.local`.**  NextAuth refused to issue cookies when `HOSTNAME=0.0.0.0` was set. This is the standard self-host setting and the doctrine implies it (host bind is needed for desktop launcher reachability), but it is a session-security knob the owner should be aware of.

3. **The primary Ollama daemon is broken.**  `ollama-windows.exe` on `G:\USB-Uncensored-LLM-main` is alive but the model store is on an unmounted drive. The Phase 1 verification used a sidecar Ollama on port 11500 against `~/.ollama/models`. **The sidecar process was killed before the report; the primary daemon is still running in its broken state.** `.env.local` currently points at the sidecar (11500). Owner choice: (a) fix the G:\ path / mount the drive and revert `LOCAL_LLM_BASE_URL` to 11434, (b) install Ollama as a service against `~/.ollama/models` and pin to 11434, or (c) accept the sidecar 11500 pattern and add it to the desktop launcher.

4. **Gate C screenshot does not show the full Cesium-painted globe.**  Headless Edge's WebGL composer takes longer to settle than the script's post-eval window. The entity markers and the active-layer counts are visible and unambiguous in the sidebar — that's the actual gate — but a future verification harness should either run non-headless or use Cesium's `Scene.requestRenderMode` + an explicit "rendered" hook.

5. **The `/setup` walkthrough was scripted, not click-walked.**  The Preview MCP's `preview_fill` does not trigger React's controlled-input `onChange`, so the form did not retain values when I tried to walk through it via automation. The fallback (a Node script using the exact same `bcryptjs.hashSync` + `prisma.user.create` code path the server action uses) is faithful to the server-action behavior. An interactive owner would walk it normally.

6. **Gate F off-site traffic is non-trivial.**  Cesium Ion, Bing Maps, and unpkg.com plugin downloads are doctrine-protected in Phase 1 but they're real outbound calls. Any "sovereign" posture goal will require Phase 2+ work: a self-hosted tile server (or controlled `NEXT_PUBLIC_CESIUM_ION_TOKEN`/`NEXT_PUBLIC_BING_MAPS_KEY` accounts), and a controlled plugin mirror (the `WWV_BRIDGE_TOKEN` env var hints this is already designed for).

7. **`launch-oculus0osint.ps1` no longer pins demo edition.**  Old script forced `NEXT_PUBLIC_WWV_EDITION='demo'` on launch — that was the source of the prior bogus-pass screenshot. New script pins `local` and uses port 3010. The desktop launcher will now reflect the real edition.

---

## 10. Open Questions for Owner

1. **Primary Ollama:** which option (a/b/c in §9.3)?
2. **`AUTH_TRUST_HOST=true`** — confirm it should live in `.env.local` long-term, or move to a launcher-set env, or harden the host check differently?
3. **Sovereign Phase 2 scope:** Cesium tile server + plugin mirror is non-trivial work and crosses into the ARGOS-or-sixth-interface decision. Phase 1 noted both paths should remain viable; please confirm before the next phase starts.
4. **Docs re-branding pass:** is this part of the WWV→Oculus0Osint surface contract, or a separate stream of work?
5. **`logs/assistant-audit.jsonl`** is now growing in the repo working tree. Should it be `.gitignore`d? (Currently the repo's existing `.gitignore` covers `logs/`, so this is informational.)

---

## 11. Recommended Next Phase

**Phase 2 candidate: Sovereign Imagery & Plugin Mirror.**

Touches: `next.config.ts` CSP, `src/lib/marketplace/registryClient.ts`, `src/core/globe/imagery` setup, `NEXT_PUBLIC_CESIUM_ION_TOKEN`, `NEXT_PUBLIC_BING_MAPS_KEY`, `NEXT_PUBLIC_MARKETPLACE_URL`, plus a small mirror service or static plugin bundle.

Goal: close Gate F properly — drive the off-site outbound list to zero (or to a documented, owner-controlled set of endpoints) without violating the doctrine's "do not modify SDK identifiers, package names, WWV_* contracts, marketplace URL constants" rule.

**Do NOT start Phase 2 without owner approval.** This report is the deliverable. Standing down.

---

## 12. Commit

- Commit SHA: `286a566`
- Branch: `main`
- Subject: `phase 1: local edition lockdown, telemetry strip, verification gates`
- Push status: **not pushed**. Awaiting owner approval before any push.
