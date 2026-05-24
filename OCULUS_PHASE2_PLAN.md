# Oculus0Osint — Phase 2 Plan

**Phase:** Narrow Plugin Mirror
**Status:** Plan (scope-lock before execution)
**Predecessor:** Phase 1.5 (commit `e4f4833`)
**Authority:** owner delegated narrow-plugin-mirror direction; ARGOS coupling decision and imagery work explicitly deferred.

---

## Why narrow

Phase 1 Gate F showed three categories of off-site outbound:

| Category | Risk | Phase 2 plan |
| --- | --- | --- |
| `unpkg.com` plugin bundles | **HIGH** — executes arbitrary remote JavaScript on every page load | **Close in Phase 2.** |
| `api.cesium.com` (Cesium Ion default token) | Medium — passive read of terrain / imagery metadata | Defer. |
| `dev.virtualearth.net`, `ecn.t*.tiles.virtualearth.net` (Bing Maps tiles) | Medium — passive read of raster tiles | Defer. |

The unpkg fetches are the RCE surface. Imagery is passive. Phase 2 closes the highest-risk hole without gambling on the ARGOS-coupling architectural decision (which affects imagery architecture but not the plugin loader). Imagery + Cesium / Bing work becomes Phase 3 once the coupling is settled.

## Doctrine compatibility

Per the Phase 1 doctrine: *"Do not modify upstream WorldWideView SDK identifiers, @worldwideview/* package names, WWV_* env contracts, or marketplace URL constants."*

The marketplace URL is **already** env-var overridable in the codebase:
- `src/lib/marketplace/registryClient.ts` reads `process.env.WWV_REGISTRY_URL ?? "https://marketplace.worldwideview.dev/api/registry"`.
- `src/lib/marketplace/seedDefaultPlugins.ts` and `src/app/api/marketplace/*` similar pattern.

Phase 2 does **not** change those default constants. It sets the env-var overrides to point the running app at a local static mirror. The compatibility contract is preserved — anyone running this fork with `WWV_REGISTRY_URL` unset still gets the upstream marketplace.

## Scope (in)

1. **Mirror sync script** — `scripts/sync-plugin-mirror.mjs`
   - Reads the upstream registry index and the manifest of each installed plugin.
   - Downloads the plugin bundle (the `frontend.mjs` file from `unpkg.com/@worldwideview/wwv-plugin-*@version/dist/frontend.mjs`).
   - Writes everything under `public/wwv-mirror/`:
     - `public/wwv-mirror/registry.json` — copy of `/api/registry` upstream response (or a hand-curated subset)
     - `public/wwv-mirror/plugins/@worldwideview/wwv-plugin-<name>@<version>/dist/frontend.mjs`
   - One-time operation, owner-run. The mirror is checked in (or at least listed as a managed snapshot in the report) so the sovereign runtime never makes the unpkg call.
   - Records every URL fetched and its SHA-256 into a `manifest.json` for audit.

2. **Env overrides**
   - `launch-oculus0osint.ps1` sets:
     - `NEXT_PUBLIC_MARKETPLACE_URL=http://localhost:3010/wwv-mirror/`
     - `WWV_REGISTRY_URL=http://localhost:3010/wwv-mirror/registry.json`
   - `.claude/launch.json` mirrors the same for the Preview harness.
   - `.env.example` documents both overrides.

3. **CSP tightening**
   - `next.config.ts` `script-src` drops `https://unpkg.com` and `https://cdn.jsdelivr.net`.
   - Cesium-related `https://api.cesium.com`, `https://dev.virtualearth.net`, `*.tiles.virtualearth.net` stay until Phase 3.

4. **Validate manifest changes**
   - `src/core/plugins/validateManifest.ts` line 45 (`entry.includes(".worldwideview.dev")`) — this whitelists the WWV CDN domain for plugin `entry` URLs. Phase 2 *adds* `http://localhost:3010/wwv-mirror/` to the allowed origins **without** removing the existing one (compatibility kept).

## Scope (out)

- Cesium Ion / Bing Maps work — deferred to Phase 3.
- Self-hosted tile server — deferred.
- ARGOS coupling decision — owner.
- Vendoring plugin sources into `packages/` — explicitly avoided; the mirror is a static-asset approach, not a source-tree move, to keep the doctrine's "@worldwideview/* package names" surface untouched at the registry/loader level.
- Local NPM registry mirror (Verdaccio) — overkill for the static frontend bundles being loaded.
- Migrating models / repo to `F:\` — owner-triggered later.
- ARGOS merge — owner-triggered later.

## Gates

| Gate | Subject | Pass condition |
| --- | --- | --- |
| **2A** | Mirror sync script ran | `public/wwv-mirror/registry.json` exists, with N plugin manifests; matching `public/wwv-mirror/plugins/.../frontend.mjs` files exist; sync manifest records the upstream URLs + checksums. |
| **2B** | Env overrides take effect | `/api/marketplace/load` returns plugin list sourced from local mirror; no upstream marketplace URL appears in server logs at runtime. |
| **2C** | Plugin still loads in UI | The owner can install and view a plugin via the UI; layer toggle works; entities render. |
| **2D** | Gate F re-run shows zero `unpkg.com` requests | Headless audit captures no `https://unpkg.com/*` outbound. Cesium + Bing remain (out of scope). Annotated in `_phase2_verification/gate-f-network.txt`. |
| **2E** | CSP tightened | `next.config.ts` `script-src` no longer contains `unpkg.com` or `cdn.jsdelivr.net`. Page still loads (no CSP violations in browser console). |

## Files touched (estimate)

| File | Change |
| --- | --- |
| `scripts/sync-plugin-mirror.mjs` | new |
| `public/wwv-mirror/registry.json` | new (generated) |
| `public/wwv-mirror/plugins/**` | new (generated) |
| `launch-oculus0osint.ps1` | add 2 env vars |
| `.claude/launch.json` | add 2 env vars |
| `.env.example` | document the 2 env vars |
| `next.config.ts` | tighten `script-src` |
| `src/core/plugins/validateManifest.ts` | widen allowed `entry` origins to include localhost mirror |
| `_phase2_verification/` | gate evidence |
| `OCULUS_PHASE2_REPORT.md` | new |

No source-of-truth changes to `@worldwideview/*` package names, `WWV_*` env contract names, or any default URL constants.

## Risk register

1. **Initial mirror sync requires upstream network access.** The `sync-plugin-mirror.mjs` script is the one operation that must talk to `unpkg.com` (and the upstream registry). Documented as an explicit owner action; not part of normal runtime.
2. **Mirror staleness.** If upstream plugins update, the mirror does not. By design — the owner controls when to re-sync. Sync script logs upstream version + checksum for audit.
3. **Plugin manifest entry URLs.** Some plugin manifests embed absolute URLs to `unpkg.com` for their own internal assets (icons, sub-bundles). The sync script needs to rewrite those to point at the local mirror, OR the loader needs a URL-rewrite hook. Will assess during inventory; may add a small `rewriteManifestUrls()` step.
4. **CSP regression.** Browser may surface unexpected CSP violations after the tighten. Will keep a quick rollback path in the commit history.

## Deliverable

- `OCULUS_PHASE2_REPORT.md` mirroring the Phase 1 report shape.
- `_phase2_verification/` with gate evidence.
- One or more commits; not pushed without owner OK.

---

Executing on confirmation of this plan. If any item needs adjustment, redirect now; otherwise I proceed.
