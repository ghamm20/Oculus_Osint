# Oculus0Osint — Phase 4 Plan

**Phase:** Local Data Engine Stub
**Status:** Plan (scope-lock before execution)
**Predecessor:** Phase 3 (commits `709ed61` + `42f3d5f`)

---

## Why a stub, not the upstream engine

The Phase 3 report recommended bringing up the upstream `wwv-data-engine` service. Inventory shows:

- `docker-compose.yml` builds `wwv-data-engine` from `../wwv-data-engine` — a sibling directory that **does not exist** in this working tree.
- The upstream service is closed-source / not available in any of the user's mounted drives (PNY G:, ARGOSUSB H:, etc.).
- Even if we could obtain it, the upstream container's purpose is to host third-party seeders we don't have either.

Meanwhile, the toast "Data Engine API returned 404" is a real sovereignty issue: the aviation plugin (and every other seeded plugin) is silently calling `https://dataengine.worldwideview.dev/api/{pluginId}` from the browser whenever its layer is enabled. That's an off-site call we missed in the Phase 3 Gate F audit because Gate F ran without layers enabled.

**Phase 4 builds a minimal local data engine stub.** It's a small Node script that runs alongside the Oculus app, listens on `localhost:5000`, and:

1. Serves `GET /manifest` returning `{plugins: [...all known plugin IDs]}` so the existing `resolveEngineUrl.ts` routes plugins to the local engine instead of the cloud fallback.
2. Serves `GET /api/{pluginId}?lookback=15m` returning `{items: [...]}` by translating Oculus's own GeoJSON endpoints (`/api/aviation`, `/api/earthquake`, etc.) into the array-of-entities shape the plugin code expects.
3. Serves `GET /stream` (WebSocket) with the welcome → subscribe protocol the upstream engine implements, sending periodic data refreshes by polling Oculus's REST endpoints.

This isn't a full replacement for the upstream engine — it doesn't run third-party seeders, doesn't multiplex sources, doesn't have a SQL backend. It's a sovereign-posture shim that closes the upstream-engine outbound and silences the toast.

## Doctrine surface

Untouched:
- `@worldwideview/*` package names and SDK identifiers — the stub speaks the engine's wire protocol, not the SDK contract.
- `WWV_*` env contract names — the stub honors `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL`, which is the existing seam.
- Default URL constants — the cloud default `https://dataengine.worldwideview.dev` stays in code as fallback; only the env-var override flips runtime behavior.

## Scope (in)

1. **`scripts/local-data-engine.mjs`** — minimal Node express + ws server.
   - Reads list of supported plugin IDs (the 15 seeded in Phase 2).
   - Translates Oculus's `/api/{id}` GeoJSON to the engine's `{items: [...]}` shape.
   - Implements the WS welcome / subscribe / data-push protocol observed in `src/core/data/WsClient.ts`.
   - Polls Oculus's REST endpoints on a configurable interval (default 30s) to refresh subscribers.

2. **Launcher integration** — `launch-oculus0osint.ps1` starts the engine stub on `localhost:5000` if not running, similar to the Ollama auto-start pattern. `.claude/launch.json` matches.

3. **Env var** — set `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000` in `.env.local` so the host globals + resolver point at the stub by default.

4. **Documentation** — `.env.example` documents the new env var.

5. **Verification** — Gate F-extended: load page, **toggle layers ON**, audit network. Pass if zero off-site requests for at least the seeded data layers. Confirm toast no longer fires.

## Scope (out)

- Real wwv-data-engine container (closed source / not available).
- Per-plugin custom seeders (live tested only with aviation/earthquake/wildfire — the 3 Gate C layers).
- Historical playback / `?time=` endpoint — only `?lookback=` is implemented.
- Camera streams, ARGOS feeds — these have their own non-engine endpoints and aren't routed through `${engineUrl}/api/{id}`.
- A real database for the engine — the stub is stateless, polls upstream Oculus REST on demand.
- Compose-level integration — the stub is a Node script, not a Docker service.

## Gates

| Gate | Subject | Pass condition |
| --- | --- | --- |
| **4A** | Stub runs cleanly | `node scripts/local-data-engine.mjs` boots, binds 5000, `/manifest` returns the plugin list, `/api/aviation?lookback=15m` returns `{items: [...]}` shape. |
| **4B** | App connects to stub | With `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000`, the app's `resolveEngineUrl` resolves to localhost. Verified by browser DevTools console showing `[EngineManifest] Local engine detected`. |
| **4C** | No "Data Engine API returned 404" toast | Toggle aviation / earthquake / wildfire layers in the UI. Toast does not fire. |
| **4D** | Plugins receive entities | Sidebar entity counts > 0 for toggled layers. Globe shows the entities. |
| **4E** | Gate F clean with layers ON | Headless audit with layer-toggle eval. No off-site requests beyond Oculus's existing data fetches to OpenSky / USGS / NASA (those are inside Oculus's `/api/*` handlers, not from the browser). |
| **4F** | Launcher autostarts the stub | `launch-oculus0osint.ps1` spins it up. Closing and reopening the launcher reuses the existing process. |

## Files touched (estimate)

| File | Change |
| --- | --- |
| `scripts/local-data-engine.mjs` | new (~150 lines) |
| `launch-oculus0osint.ps1` | add `Start-DataEngineIfNeeded` block parallel to `Start-OllamaIfNeeded` |
| `.claude/launch.json` | inline data-engine startup |
| `.env.local`, `.env.example` | document the env var |
| `_phase4_verification/` | gate evidence |
| `OCULUS_PHASE4_REPORT.md` | new |

No SDK / package / env-contract / URL-constant default changes.

## Risk register

1. **Plugin payload shape mismatch.** Each plugin code base parses the engine response differently. The aviation plugin reads `n.items`. Other plugins may read `n.payload`, `n.entities`, or something else. The stub will start with aviation's shape and extend as we test. Plugins whose shape we don't match will silently get empty results (the plugin's own `.catch` swallows the error after console.error).

2. **REST `/api/aviation?lookback=15m` time semantics.** The plugin probably wants historical aircraft from 15 minutes ago. Oculus's `/api/aviation` returns current-instant OpenSky data. The stub passes the query string through to Oculus's endpoint which ignores it; the plugin will get current data rather than 15-min lookback. Acceptable trade-off — the UI gets live data, just not history.

3. **WebSocket stream protocol drift.** The upstream engine sends `welcome` + `data` messages with specific shapes. WsClient.ts is the wire-format ground truth. The stub will match that.

4. **Polling load.** Stub polls Oculus's `/api/{id}` every 30s per subscriber. With 15 plugins, that's 30 hits/minute against external data sources (OpenSky, USGS, etc.) — well within rate limits but not zero.

5. **Stale data on disconnect.** The stub doesn't queue updates while a client is offline. Reconnections get fresh data on next poll, not catch-up. Same as upstream behavior, no regression.

## Deliverable

- `OCULUS_PHASE4_REPORT.md` mirroring Phase 1/2/3 reports.
- `_phase4_verification/` with gate evidence.
- Commits on `main`; not pushed.

---

Executing.
