# Oculus0Osint — Phase 2 Report

**Phase:** Narrow Plugin Mirror
**Captured:** 2026-05-24
**Working tree:** `C:\AI\OCULUSBOUND\Oculus-osint-main`
**Predecessor:** Phase 1.5 (commit `e4f4833`)
**Stance:** standing down after this report; await owner OK before any push or follow-on phase.

---

## 1. Scope Recap

From `OCULUS_PHASE2_PLAN.md`:
- **In scope:** replace `unpkg.com` plugin loading with a same-origin static mirror at `/wwv-mirror/`. Tighten CSP. Wire env-var overrides at launch.
- **Out of scope:** Cesium Ion, Bing Maps, ARGOS coupling decision, plugin source vendoring, NPM registry mirror. All deferred.

Doctrine surface preserved: no changes to `@worldwideview/*` package names, `WWV_*` env contract names, or default URL constants. The mirror is wired through existing env-overridable seams (`NEXT_PUBLIC_MARKETPLACE_URL`, `WWV_REGISTRY_URL`).

---

## 2. What Changed

### New
- `scripts/sync-plugin-mirror.mjs` — one-time / on-demand operation that hits the upstream WWV marketplace and unpkg.com, downloads all signed-registry plugins + bundles, rewrites manifests to point at the local mirror, and emits a SHA-256 audit trail (`mirror-manifest.json`). This is the **only** Phase 2 operation that touches the public internet; runtime never reaches out.
- `public/wwv-mirror/` (20 MB) — generated static mirror, organized as:
  - `registry.json` — copy of upstream `/api/registry` (signed)
  - `api/registry` — same content at the URL the registryClient expects
  - `api/plugins-index.json` — copy of upstream `/api/plugins` (array form)
  - `api/plugins/{id}` — 30 per-plugin manifests, rewritten:
    - `entry` set to `http://localhost:3010/wwv-mirror/plugins/.../frontend.mjs`
    - `format` set to `"bundle"`
    - `npmPackage` **stripped** (so the seeder/install-route rewrite paths don't re-overwrite `entry` with the upstream unpkg URL)
  - `plugins/@worldwideview/wwv-plugin-*@<version>/dist/frontend.mjs` — 29 bundle files (the `iss` plugin's third-party namespace returned 404 on upstream unpkg; manifest mirrored without a bundle)
  - `mirror-manifest.json` — audit log with upstream URL + SHA-256 + byte size for every file

### Modified
- `next.config.ts`:
  - CSP `script-src` no longer includes `https://unpkg.com` or `https://cdn.jsdelivr.net`. Comment explains why.
  - New `rewrites()` block maps `/wwv-mirror/api/plugins` → `/wwv-mirror/api/plugins-index.json` so the file-vs-directory collision doesn't break the index endpoint.
- `src/proxy.ts`:
  - Added `path.startsWith("/wwv-mirror")` to the static-pass allowlist. Manifest URLs are extension-less by design (they mirror the upstream API shape), so the `path.includes(".")` catch-all didn't fire and requests were being redirected to `/login`.
- `launch-oculus0osint.ps1`:
  - Sets `NEXT_PUBLIC_MARKETPLACE_URL=http://localhost:3010/wwv-mirror` and `WWV_REGISTRY_URL=http://localhost:3010/wwv-mirror/api/registry` in both the foreground env and the spawned server env.
- `.claude/launch.json`:
  - Same two env vars added to the Preview / harness launcher so it stays equivalent to the desktop launcher.
- `.env.local` and `.env.example`:
  - Both document the two new env vars. The mirror is the default for any standalone-mode launch.

### Untouched (doctrine-protected)
- All `@worldwideview/*` package names.
- `WWV_*` env contract names — `WWV_REGISTRY_URL` and `WWV_BRIDGE_TOKEN` are existing env knobs the codebase already supports.
- The default URL constants at `src/lib/marketplace/registryClient.ts:9`, `src/lib/marketplace/seedDefaultPlugins.ts:8`, `src/app/api/marketplace/check-updates/route.ts:6`, `src/app/api/marketplace/install/route.ts:50`. All still default to `https://marketplace.worldwideview.dev`. Only the env-var override at runtime is changed.

---

## 3. Gates

Evidence in `_phase2_verification/`.

### Gate 2A — Mirror sync succeeded — **PASS**

```
[mirror-sync] step 1: registry
  signed registry: 30 plugin IDs, issued 2026-05-24T23:22:16.932Z
[mirror-sync] step 2: plugin index
  index: 30 plugin manifests
[mirror-sync] step 3: per-plugin manifests + bundles
.............................  bundle FAIL for iss: ...HTTP 404
.
[mirror-sync] done. wrote 62 files, 30 plugins mirrored.
```

`public/wwv-mirror/mirror-manifest.json` has the full upstream-URL + SHA-256 + byte-size audit for every file. The `iss` failure is upstream (the third-party `@nullptr1945/wwv-plugin-iss` package doesn't ship `dist/frontend.mjs` at the expected path on unpkg) — not a sovereignty issue. Its manifest is mirrored without a bundle; if the owner needs `iss`, an alternative source for that one plugin can be added in a follow-up.

### Gate 2B — Env overrides take effect — **PASS**

After launcher restart with `NEXT_PUBLIC_MARKETPLACE_URL=http://localhost:3010/wwv-mirror`:

- `/api/marketplace/load` returns 15 plugin manifests with `trust: "verified"` (signature check on the mirrored registry payload still passes — bytes are byte-for-byte identical to upstream).
- Every entry URL in the seeded `installed_plugins` table reads `http://localhost:3010/wwv-mirror/plugins/.../frontend.mjs`:

```
 airports                | http://localhost:3010/wwv-mirror/plugins/@worldwideview/wwv-plugin-airports@1.1.3/dist/frontend.mjs
 aviation                | http://localhost:3010/wwv-mirror/plugins/@worldwideview/wwv-plugin-aviation@1.0.21/dist/frontend.mjs
 borders                 | http://localhost:3010/wwv-mirror/plugins/@worldwideview/wwv-plugin-borders@1.0.12/dist/frontend.mjs
 ... (15 total)
```

### Gate 2C — Plugin loads in UI — **PASS**

Authenticated session loaded `/`. Globe paints. Sidebar lists the seeded plugins. Toggled aviation / earthquake / wildfire layers; the right-side configuration pane opens for the chosen plugin (Earthquakes layer shown). The "Data Engine API 404" toast visible in the screenshot is the WebSocket subscription for live plugin updates — that's a separate infrastructure (`wwv-data-engine` Docker service) that is not part of Phase 2 scope; the **plugin code itself loaded from the mirror** as confirmed by Gate 2D.

Evidence: `_phase2_verification/gate-2c-plugin-loads.png`

### Gate 2D — Zero unpkg.com / jsdelivr requests — **PASS**

Headless audit captured 126 requests during a full authenticated page load. **8 of those went to `/wwv-mirror/plugins/.../frontend.mjs`** for plugin bundles. Zero went to `unpkg.com` or `cdn.jsdelivr.net`.

Unique off-site origins after Phase 2:

```
http://ecn.t0.tiles.virtualearth.net
http://ecn.t1.tiles.virtualearth.net
http://ecn.t2.tiles.virtualearth.net
http://ecn.t3.tiles.virtualearth.net
https://api.cesium.com
https://dev.virtualearth.net
```

Cesium Ion + Bing Maps remain — both deferred to Phase 3 by design.

Evidence: `_phase2_verification/gate-f-network.txt` (full request listing + triage block).

### Gate 2E — CSP tightened, page still loads — **PASS**

`next.config.ts` `script-src` is now `'self' 'unsafe-eval' 'unsafe-inline' blob:` — no `unpkg.com`, no `cdn.jsdelivr.net`. The headless capture in Gate 2D was a full authenticated page load with the tightened CSP active; plugin bundles executed without CSP violations (proven by their `+ GET` entries in the network log returning HTTP 200 with `Content-Type: application/javascript`).

---

## 4. Honest Issues, Not Papered Over

1. **`iss` plugin bundle missing from mirror.** The `@nullptr1945/wwv-plugin-iss@1.1.1` package on unpkg.com doesn't include `dist/frontend.mjs` at the canonical path. Manifest mirrored, bundle missing. `iss` is not in `DEFAULT_PLUGIN_IDS` so it doesn't break the default install. Owner can add a custom source for it later if needed.

2. **Mirror is a point-in-time snapshot.** Phase 2's sync was run on 2026-05-24T23:22Z. Plugins may have upstream updates after that. The `mirror-manifest.json` records the sync timestamp; the `/api/marketplace/check-updates` route still works (it compares local installed versions against the mirrored index, which reflects whatever upstream looked like at sync time). Re-sync is a one-command op: `node scripts/sync-plugin-mirror.mjs`.

3. **`mirror-manifest.json` SHA-256 hashes are NOT cross-validated against any upstream-published integrity claim.** unpkg / the WWV marketplace don't publish SRI hashes. The hashes in `mirror-manifest.json` are *our* record of what we got, so a future re-sync (or a downstream operator using this fork's mirror) can detect drift. They aren't proof the upstream wasn't tampered with at the moment of download. The signed `/api/registry` payload does give us an Ed25519-verified list of plugin IDs (the existing `registryClient.ts` check still runs), which is the closest thing to a sovereign trust anchor.

4. **The `mirror-manifest.json` and the 20 MB of bundles are checked into git.** This is intentional — it makes the mirror part of the working tree, so cloning the repo gets a known-good plugin set without needing the upstream marketplace to be reachable. It also makes the move to `F:\` a single `mv` later. If size becomes an issue, we can add `public/wwv-mirror/plugins/**` to `.gitignore` and require operators to run `sync-plugin-mirror.mjs` after clone — but that re-introduces upstream dependency at install time, which works against the goal.

5. **Database reset was required.** Phase 1 had already run the seeder against the *upstream* marketplace, so `installed_plugins` contained rows with `entry` URLs pointing at unpkg. I did `DELETE FROM installed_plugins; DELETE FROM settings WHERE key='defaults_seeded'` and let the seeder re-run against the mirror. On any system that's been running with the upstream marketplace, the same one-time reset is required. The sync script does not perform this reset automatically — it's a destructive op and belongs to the operator. Documented in §5 below.

6. **Manifests intentionally diverge from upstream.** Each mirrored manifest has `npmPackage` stripped and `entry` rewritten. This is the only way to get the existing seeder / install code to skip its "rewrite entry to unpkg" pass without modifying that code (which is doctrine-adjacent). If a future upstream change relies on `npmPackage` being present at the loader stage, that would surface as a load failure and we'd need to revisit. Captured in code comment + this report.

---

## 5. Operator Notes — How to Refresh the Mirror

```powershell
# 1. (one-time) make sure DB seeder will re-run against fresh manifests
docker exec oculus-osint-main-db-1 psql -U postgres -d worldwideview -c "DELETE FROM installed_plugins; DELETE FROM settings WHERE key='defaults_seeded';"

# 2. pull fresh manifests + bundles from upstream
cd C:\AI\OCULUSBOUND\Oculus-osint-main
node scripts/sync-plugin-mirror.mjs

# 3. rebuild so Next.js picks up the new public/ contents
corepack pnpm build

# 4. restart
.\launch-oculus0osint.ps1
```

Step 1 is only required when the upstream plugin versions have changed; if you're just re-syncing the same versions, you can skip it.

---

## 6. Files Changed

| File | Status |
| --- | --- |
| `scripts/sync-plugin-mirror.mjs` | new (~140 lines) |
| `public/wwv-mirror/registry.json` | new (generated) |
| `public/wwv-mirror/api/registry` | new (generated) |
| `public/wwv-mirror/api/plugins-index.json` | new (generated) |
| `public/wwv-mirror/api/plugins/*` | new (30 files, generated) |
| `public/wwv-mirror/plugins/**/dist/frontend.mjs` | new (29 files, generated) |
| `public/wwv-mirror/mirror-manifest.json` | new (audit trail) |
| `next.config.ts` | CSP tighten + rewrites block |
| `src/proxy.ts` | `/wwv-mirror` whitelist |
| `launch-oculus0osint.ps1` | 2 env vars |
| `.claude/launch.json` | 2 env vars |
| `.env.local` | 2 env vars |
| `.env.example` | 2 env vars documented |
| `scripts/phase1-gate-f.mjs` | also lists `/wwv-mirror` hits as evidence |
| `OCULUS_PHASE2_PLAN.md` | already committed in scope-lock |
| `OCULUS_PHASE2_REPORT.md` | this file |
| `_phase2_verification/` | gate evidence |

No SDK identifiers, package names, env contract names, or default URL constants were modified.

---

## 7. Open Questions for Owner

1. **Should `public/wwv-mirror/` stay in git?** Currently yes (20 MB, in tree). Trade-off: clone-and-go vs. repo bloat. Recommendation: keep until repo size becomes a real problem.

2. **`iss` plugin** — does the owner need it? If so, the unpkg URL is broken upstream; we'd need an alternative source. If not, no action.

3. **Mirror re-sync cadence.** The sync is owner-triggered. Should there be a launcher hook that warns "mirror is N days old"? Adds telemetry / surface area; not in Phase 2 scope.

4. **Phase 3 = imagery, ARGOS coupling, or both?** Phase 2 closed the RCE outbound. The remaining off-site requests are passive imagery reads (Cesium Ion + Bing). The ARGOS coupling decision (sixth interface vs map pane) still affects how Phase 3 is shaped; that decision is still owner-pending.

---

## 8. Recommended Next Phase

**Phase 3 candidate: Sovereign Imagery + ARGOS coupling resolution.**

Pre-Phase-3 deliverable: owner picks sixth interface vs ARGOS map pane.

Phase 3 then either:
- (sixth interface) Replace Cesium Ion default token with an owner-controlled token, replace Bing Maps with an owner-controlled key, or stand up a self-hosted tile cache. The plugin mirror pattern from Phase 2 is the template.
- (ARGOS map pane) The imagery surface moves into ARGOS's chrome and ARGOS becomes the tile-cache owner. Oculus0Osint reduces to a globe-renderer + plugin host.

**Do NOT start Phase 3 without owner confirmation.** Standing down.

---

## 9. Commit

- Commit SHA: `20bcd47`
- Branch: `main`
- Subject: `phase 2: plugin mirror — replace unpkg.com with same-origin static mirror`
- Push status: **not pushed**. Awaiting owner approval.
- Diff: 73 files, +520,937 / -3. The big number is almost entirely the 29 plugin bundles (compiled JS) and the 30 manifest JSON files now living in `public/wwv-mirror/`.
