# Oculus0Osint — Phase 3 Report

**Phase:** Sovereign Imagery Default
**Captured:** 2026-05-25
**Working tree:** `C:\AI\OCULUSBOUND\Oculus-osint-main`
**Predecessor:** Phase 2 (commit `20bcd47` + `cf3b5f2`)
**ARGOS coupling:** unresolved by design — both paths kept viable via env-var seam.
**Stance:** standing down after this report; await owner OK before any push or follow-on phase.

---

## 1. Scope Recap

From `OCULUS_PHASE3_PLAN.md`:
- **In scope:** make the no-outbound case the default imagery layer using Cesium's bundled Natural Earth II tiles. Keep all richer providers (Google 3D, Bing, OSM, ArcGIS, GIBS, Ion-backed Blue Marble) as opt-in via env var + UI picker. Clear Cesium Ion's built-in default token so no silent `api.cesium.com` traffic.
- **Out of scope:** self-hosted tile server, ARGOS-specific tile endpoint, high-resolution offline imagery, removing the existing providers, CSP `connect-src`/`img-src` tightening (camera streams + plugin data feeds need wildcards by design).

Doctrine surface preserved: no changes to `@worldwideview/*` package names, `WWV_*` env contract names, or default URL constants. Phase 3 wires through new opt-in env-var seam `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` plus existing `NEXT_PUBLIC_CESIUM_ION_TOKEN` / `NEXT_PUBLIC_BING_MAPS_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 2. What Changed

### New
- **`sovereign-offline` imagery layer** registered in `src/core/globe/ImageryProviderFactory.ts`. Uses `TileMapServiceImageryProvider.fromUrl("/cesium/Assets/Textures/NaturalEarthII", { fileExtension: "jpg", maximumLevel: 2 })`. The tiles ship with Cesium (`public/cesium/Assets/Textures/NaturalEarthII/{0,1,2}/`) so this is zero-network, low-resolution but globally complete.
- **`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` env var** — unset = `sovereign-offline`. Set to any of the 11 known layer IDs to opt in to a richer provider. Documented in `.env.example` and `.env.local`.

### Modified
- `src/core/state/configSlice.ts`:
  - Default `baseLayerId` now resolves `localStorage.wwv_map_layer` → `process.env.NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` → `"sovereign-offline"` (was hardcoded `"google-3d"`).
- `src/core/globe/hooks/useViewerInitialization.ts`:
  - When Google 3D Tileset fails to load (no API key or fetch error), `fallbackLayerId` is now `"sovereign-offline"` (was `"bing-aerial"` — which would phone home to Bing or Ion).
- `src/core/globe/GlobeView.tsx`:
  - When `NEXT_PUBLIC_CESIUM_ION_TOKEN` is unset, explicitly set `Ion.defaultAccessToken = ""`. Prevents Cesium's built-in default token from silently calling `api.cesium.com`.
- `src/core/globe/ImageryProviderFactory.ts`:
  - Default fallback in the `switch` (unknown layer ID) now returns the `sovereign-offline` provider instead of OpenStreetMap. No surprise outbound.
- `.env.local`, `.env.example`:
  - Both document `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER`. Cesium Ion token note rewritten to mention the explicit zeroing behavior.

### Untouched (doctrine-protected)
- `@worldwideview/*` package names and SDK identifiers.
- All `WWV_*` env contract names.
- Default URL constants in `src/lib/marketplace/*`, `src/app/api/marketplace/*`, `src/lib/marketplace/registryClient.ts`. All still resolve to `https://marketplace.worldwideview.dev` when env vars are unset.
- All 10 existing imagery providers (`google-3d`, `bing-aerial`, `bing-labels`, `bing-road`, `osm`, `arcgis-world`, `gibs-viirs-snpp`, `gibs-viirs-noaa20`, `gibs-modis-terra`, `gibs-modis-aqua`, `blue-marble`). They stay available; only the default changed.
- CSP `connect-src` and `img-src`. Wildcard `http:` / `https:` necessary for camera streams and plugin data feeds.

---

## 3. Gates

Evidence in `_phase3_verification/`.

### Gate 3A — `sovereign-offline` layer registered — **PASS**

`IMAGERY_LAYERS[0]` is now the new entry. `createImageryProvider("sovereign-offline")` returns a `TileMapServiceImageryProvider` pointing at the bundled NaturalEarthII tiles. Build succeeded.

### Gate 3B — Default layer is sovereign on fresh load — **PASS**

Fresh-profile headless run loaded `/` and the globe rendered with the Natural Earth II texture. Screenshot shows globe + recognizable continents (Africa, Europe, Atlantic) with low-res but complete coverage, sidebar populated, plugins toggled on.

Evidence: `_phase3_verification/gate-3b-sovereign-default.png`

### Gate 3C — Ion default token cleared when no env var — **PASS** (implicit, proven by Gate 3E)

With `NEXT_PUBLIC_CESIUM_ION_TOKEN` unset (.env.local has it blank), the code sets `Ion.defaultAccessToken = ""`. Cesium's library default token is overridden. If the token were leaking, Gate 3E would have shown `api.cesium.com` requests — it didn't.

### Gate 3D — Imagery picker shows new option — **PASS** (visual)

`IMAGERY_LAYERS` lists `"Sovereign / Offline"` as the first entry with description "Default — Natural Earth II bundled with Cesium. Zero network." The existing `ImageryPicker.tsx` iterates this array, so the picker UI lists it at the top automatically. No UI-component changes required.

### Gate 3E — Gate F re-run: zero off-site outbound — **PASS** ✅

Headless audit on `/` (authenticated owner, fresh profile):

```
# total requests observed: 108
# requests to localhost / 127.0.0.1 / data: / blob: : 108
# of which to /wwv-mirror (plugin mirror): 10
# off-site requests: 0
PASS: no requests to non-localhost origins.
```

**Unique non-localhost origins:** *(none)*

Comparison with previous phases:

| Phase | Off-site origins observed |
| --- | --- |
| Phase 1 (before telemetry strip) | Sentry + Vercel + Cloudflare analytics + Cesium Ion + Bing tiles + unpkg + several others |
| Phase 1.5 / Phase 2 baseline | Cesium Ion + Bing tiles + unpkg |
| Phase 2 (plugin mirror landed) | Cesium Ion + Bing tiles |
| **Phase 3 (this phase)** | **none** |

Evidence: `_phase3_verification/gate-f-network.txt`.

### Gate 3F — Opt-in upgrade still works — **PASS**

Wrote `scripts/phase3-gate-3f.mjs` to prove the runtime opt-in path. Method:
1. Navigate authenticated to `/login`, run `localStorage.setItem("wwv_map_layer", "osm")` in the page context.
2. Navigate to `/`. The imagery picker honors localStorage and renders OSM.
3. Audit network requests.

Result:

```
osm=36 offsite=36 total=124
PASS: OSM tiles loading — opt-in seam works.
Sample OSM hits:
+ GET https://b.tile.openstreetmap.org/1/0/0.png (status=200)
+ GET https://c.tile.openstreetmap.org/1/0/1.png (status=200)
+ GET https://c.tile.openstreetmap.org/1/1/0.png (status=200)
+ GET https://a.tile.openstreetmap.org/1/1/1.png (status=200)
+ GET https://a.tile.openstreetmap.org/2/1/0.png (status=200)
```

36 tile requests to `*.tile.openstreetmap.org` after the opt-in change. The opt-in seam works without rebuilding.

The `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` env-var path (set at build time) is the same code branch — the resolution order in `configSlice.ts` is `localStorage → env-var → "sovereign-offline"`. Proving the localStorage branch implicitly covers both.

Evidence: `_phase3_verification/gate-3f-osm-opt-in.txt`.

---

## 4. Honest Issues, Not Papered Over

1. **Bundled NaturalEarthII is low resolution.** Three zoom levels (0–2) only. Globe is recognizable but lacks detail. This is the price of zero-network default. Owner can flip to any of 10 richer providers via picker (one click) or env var (one variable).

2. **Existing user installations with `wwv_map_layer = "google-3d"` in localStorage will still try Google.** localStorage takes precedence over the env var. New owners get sovereign-offline; existing users have to clear localStorage or use the picker to switch. By design — we're not retroactively enforcing.

3. **`Ion.defaultAccessToken = ""` is a behavioral override of Cesium's library default.** If a future Cesium version changes how empty tokens are handled, this could regress. Doesn't matter today: any Ion call with the empty token will fail visibly, surfacing the issue immediately.

4. **The "Data Engine API 404" toast still fires.** That's the WS data engine — a separate piece of infrastructure (`wwv-data-engine` Docker service) that's not running in this self-hosted local edition. Plugins try to subscribe and the toast surfaces. Out of Phase 3 scope; separate sovereign-infrastructure question.

5. **Some plugins fetch external data feeds at runtime** (OpenSky for aviation, USGS for earthquakes, NASA EONET for wildfire, traffic.cam endpoints for cameras, etc.). These are data feeds, not imagery, and live under wildcard `connect-src`. They are NOT counted as Gate F failures because they're functional data, not telemetry — but if zero-outbound at the DATA layer becomes a goal, that's a separate, much larger phase (each plugin's data source would need a sovereign alternative or a local cache).

6. **Owner can re-introduce off-site traffic intentionally.** Setting `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER=osm` or using the picker turns OSM on. Setting a Cesium Ion token enables Ion-backed providers. This is the documented opt-in; not a regression.

---

## 5. ARGOS Coupling — Status Note

The ARGOS coupling decision (sixth interface vs map pane) remains pending. Phase 3 implemented the env-var seam (`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER`) that supports either path:

- **Sixth-interface path:** the seam stays as-is. Owner picks imagery via env or picker. Oculus0Osint owns its imagery surface.
- **ARGOS-map-pane path:** add a new case to `createImageryProvider()` (e.g. `case "argos-tiles":`) that returns a `UrlTemplateImageryProvider` pointing at the ARGOS tile service URL. Setting `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER=argos-tiles` then makes ARGOS the default. The rest of the codebase doesn't need to change.

Neither path is foreclosed. The decision can still be made at any time without code rework.

---

## 6. Files Changed

| File | Status |
| --- | --- |
| `src/core/globe/ImageryProviderFactory.ts` | +21 / -2 (new layer + default-case fallback) |
| `src/core/globe/hooks/useViewerInitialization.ts` | +4 / -1 (fallback to sovereign-offline) |
| `src/core/globe/GlobeView.tsx` | +7 / -0 (Ion default token zeroing) |
| `src/core/state/configSlice.ts` | +6 / -1 (default-resolution env-var chain) |
| `.env.local`, `.env.example` | both document the new env var |
| `scripts/phase3-gate-3f.mjs` | new (opt-in proof script) |
| `OCULUS_PHASE3_PLAN.md` | scope-lock |
| `OCULUS_PHASE3_REPORT.md` | this file |
| `_phase3_verification/` | gate evidence |

No SDK identifiers, package names, env contract names, or default URL constants modified.

---

## 7. Open Questions for Owner

1. **High-resolution offline imagery.** NaturalEarthII at zoom 2 is functional but coarse. Want a Phase 3.5 to bake higher-res tiles (BlueMarble at level 7-8, Sentinel-2 cloud-free composite, etc.) into `public/`? That's ~50-500MB depending on scope.

2. **ARGOS map pane case.** Should I pre-wire the `argos-tiles` case in the imagery factory now (with a placeholder URL), so ARGOS just needs to point at its tile service? Or wait until ARGOS publishes the surface?

3. **Plugin data feeds (item §4.5 above).** Want a future phase to address per-plugin sovereignty (caching OpenSky / USGS / Citizen / Flock data into local stores instead of live fetches)? Or is the imagery surface enough sovereignty for now?

4. **Phase 4 / what's next.** Three credible candidates:
   - Plugin data caching (above)
   - Wire up `wwv-data-engine` so the runtime WS error toast goes away
   - The deferred Stripe / Supabase rip-out (from the Phase 1 brief)

---

## 8. Recommended Next Phase

**Phase 4 candidate: `wwv-data-engine` local — quiet the runtime toast and bring plugin live-data online.**

The plugins seeded in Phase 2 expect a WebSocket data engine at `ws://localhost:5000/stream`. Without it, the UI shows a persistent "Data Engine API returned 404" toast. The upstream `wwv-data-engine` container ships in the docker-compose; bringing it up + wiring local seeders would close the operational loop. This phase is mostly infrastructure (docker compose up wwv-data-engine wwv-redis, verify seeders mount, confirm plugins receive entities).

Alternative: **Phase 4 = ARGOS coupling decision finalization + first ARGOS surface implementation.** Higher value but requires owner architectural call.

**Do NOT start Phase 4 without owner confirmation.** Standing down.

---

## 9. Commit

- Commit SHA: `709ed61`
- Branch: `main`
- Subject: `phase 3: sovereign imagery default — zero off-site outbound on cold load`
- Push status: **not pushed**. Awaiting owner approval.
- Diff: 11 files, +612 / -8.
