# Oculus0Osint — Phase 3 Plan

**Phase:** Sovereign Imagery Default
**Status:** Plan (scope-lock before execution)
**Predecessor:** Phase 2 (commits `20bcd47` + `cf3b5f2`)
**ARGOS coupling:** unresolved by design — both paths kept viable.

---

## Why the shape

Phase 1 + Phase 2 closed everything sovereign except the imagery surface. Gate F currently shows three categories of off-site outbound, all imagery-related:

| Origin | Reason |
| --- | --- |
| `api.cesium.com` | Cesium Ion default token, used by `IonImageryProvider` for terrain + Google Photorealistic 3D Tiles + Bing fallback. |
| `dev.virtualearth.net` | Bing Maps metadata endpoint. |
| `ecn.t{0..3}.tiles.virtualearth.net` | Bing Maps raster tiles. |

Root cause: the default `baseLayerId` is `"google-3d"`, which when no Google API key is present falls back to `"bing-aerial"`, which in turn falls back to `IonImageryProvider.fromAssetId(2)` using Cesium's built-in default token. Every one of those fetches at runtime.

**Phase 3 makes the no-outbound case the default**, by adding a `"sovereign-offline"` imagery layer that uses Cesium's bundled NaturalEarthII tiles (already shipped under `public/cesium/Assets/Textures/NaturalEarthII/`) and pointing the fallback chain at it. The existing Ion/Bing/OSM/ArcGIS/GIBS providers remain available as opt-in upgrades — choosable via the imagery picker, or made the default via env var.

## Both ARGOS paths viable

This phase introduces a clean env-var seam (`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER`) that:

- **Sixth-interface path:** owner sets `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER=osm` (or supplies a `NEXT_PUBLIC_CESIUM_ION_TOKEN`, etc.) — Oculus0Osint runs its own imagery layer choice.
- **ARGOS-map-pane path:** ARGOS injects its own URL-template imagery provider via the same env-var (`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER=argos-tiles`) once ARGOS exposes a tile endpoint. The Oculus0Osint imagery factory would gain a single new case to handle it.

The default (no env var set) is `sovereign-offline`. Neither path is foreclosed; both can be enabled by configuration.

## Scope (in)

1. **New imagery layer `sovereign-offline`** in `src/core/globe/ImageryProviderFactory.ts`. Uses Cesium's bundled NaturalEarthII via `TileMapServiceImageryProvider.fromUrl("/cesium/Assets/Textures/NaturalEarthII")`. Low-resolution but globally complete, no network.

2. **Default fallback chain** in `src/core/globe/hooks/useViewerInitialization.ts`. If no Google API key, default to `sovereign-offline` (not `bing-aerial`).

3. **Configurable default layer** via `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` env var. Falls through to `sovereign-offline` if unset. Read at `src/core/state/configSlice.ts` initial state.

4. **Cesium Ion default token zeroing**. In `src/core/globe/GlobeView.tsx`, when `NEXT_PUBLIC_CESIUM_ION_TOKEN` is NOT set, explicitly set `Ion.defaultAccessToken = ""` (or a sentinel) so Cesium does not fall back to its built-in default token. Any Ion-dependent imagery will then fail visibly — owner must opt in by providing a token.

5. **Imagery picker UI** in `src/components/panels/ImageryPicker.tsx`. The new layer appears at the top of the list with a "sovereign / offline" label and a note explaining it's the default.

6. **Documentation** in `.env.example` and `.env.local` — both env vars (`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER` plus reminders about `NEXT_PUBLIC_CESIUM_ION_TOKEN` / `NEXT_PUBLIC_BING_MAPS_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` being opt-in upgrades).

## Scope (out)

- **Self-hosted tile server** (martin / tegola). Deferred — single bundled raster set is enough for the default sovereign path.
- **ARGOS-specific tile endpoint.** Owner-architectural; only the env-var seam is added.
- **High-resolution offline imagery** beyond Cesium's bundled NaturalEarthII. Doable later via a separate `public/imagery-cache/` static dir but explicitly out of this phase.
- **OSM / GIBS / ArcGIS** changes — those providers stay available but defaults don't pick them. Phase 3 doesn't touch them.
- **Removing the existing `google-3d` / `bing-*` / `blue-marble` / `ion`-backed options.** Owner may want them; they remain opt-in. Removing them in code would foreclose an option.
- **CSP `connect-src` / `img-src` tightening.** The plugin data feeds (camera streams, OpenSky, USGS, etc.) need broad `http:` `https:` access by design. Phase 3 doesn't touch these.

## Gates

| Gate | Subject | Pass condition |
| --- | --- | --- |
| **3A** | `sovereign-offline` layer registered | Listed in `IMAGERY_LAYERS`, `createImageryProvider("sovereign-offline")` returns a working `TileMapServiceImageryProvider` from the bundled assets. |
| **3B** | Default layer is sovereign | A fresh launch (clean localStorage) renders the globe with `sovereign-offline`. `useStore.getState().mapConfig.baseLayerId === "sovereign-offline"`. |
| **3C** | Ion default token disabled when no env var | Build with `NEXT_PUBLIC_CESIUM_ION_TOKEN` unset; observe `Ion.defaultAccessToken === ""` (or similar) in client state. |
| **3D** | Imagery picker shows the new option at top | UI lists "Sovereign Offline" first, labelled as default / no-network. |
| **3E** | Gate F re-run: zero off-site outbound | Headless audit shows zero requests to `api.cesium.com`, `*.virtualearth.net`, or any other external imagery host on a fresh load. (`localhost:3010` + `/wwv-mirror` only, like Phase 2 plus the bundled `/cesium/Assets/Textures/NaturalEarthII/` requests.) |
| **3F** | Opt-in upgrade still works | Setting `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER=osm` boots the globe with OSM (not sovereign-offline). Existing imagery picker switching also still works. |

## Files touched (estimate)

| File | Change |
| --- | --- |
| `src/core/globe/ImageryProviderFactory.ts` | Add `sovereign-offline` entry and case. |
| `src/core/globe/hooks/useViewerInitialization.ts` | Change `bing-aerial` fallback to `sovereign-offline`. |
| `src/core/state/configSlice.ts` | Default `baseLayerId` resolves to env var → `sovereign-offline` if unset. |
| `src/core/globe/GlobeView.tsx` | Explicitly clear `Ion.defaultAccessToken` when no env var. |
| `src/components/panels/ImageryPicker.tsx` | (Optional — list ordering only; the picker already iterates `IMAGERY_LAYERS`.) |
| `.env.example`, `.env.local` | Document `NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER`. |
| `_phase3_verification/` | gate evidence. |
| `OCULUS_PHASE3_REPORT.md` | new. |

No SDK identifiers, package names, env contract names, or default URL constants modified.

## Risk register

1. **Cesium's `BingMapsImageryProvider.fromUrl` may not behave identically across versions.** Already a problem upstream — the fallback to Ion when key is missing happens in `ImageryProviderFactory.ts`. We aren't touching that logic, we're changing the upstream default chain so it doesn't get there.

2. **Bundled NaturalEarthII visually unimpressive.** Yes — it's a low-resolution global texture. That's the trade-off for zero-network default. Owner can flip the env var to a richer provider any time.

3. **Some existing user installations have `wwv_map_layer` cached in localStorage as `google-3d`.** Their first load won't change to sovereign-offline until they pick it manually or clear localStorage. Acceptable: the doctrine is for new defaults, not retroactive enforcement.

4. **The Phase 2 toast warning ("Data Engine API returned 404") and similar runtime errors stem from the WS data engine being absent. Those are out of scope here.**

5. **If owner later sets `NEXT_PUBLIC_CESIUM_ION_TOKEN`, Ion-backed providers (blue-marble, etc.) light up again** — that's the intended opt-in shape.

## Deliverable

- `OCULUS_PHASE3_REPORT.md` mirroring Phase 1 / Phase 2 reports.
- `_phase3_verification/` with gate evidence.
- Commits on `main`; not pushed.

---

Executing.
