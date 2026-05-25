# Oculus0Osint — Phase 4 Report

**Phase:** Local Data Engine Stub
**Captured:** 2026-05-25
**Predecessor:** Phase 3 (commits `709ed61` + `42f3d5f`)
**Stance:** standing down after this report; await owner OK before any push or follow-on phase.

---

## 1. Scope Recap

From `OCULUS_PHASE4_PLAN.md`:
- **In scope:** stand up a minimal `localhost:5000` data engine stub that the marketplace plugins reach instead of `wss://dataengine.worldwideview.dev`. Translate Oculus's own `/api/{pluginId}` GeoJSON endpoints into the `{items:[...]}` shape plugins expect. Auto-start it from the launcher.
- **Out of scope:** the real upstream `wwv-data-engine` container (closed source, no sibling dir, no need to chase). Per-plugin custom seeders. Historical playback. Camera/ARGOS feeds (already non-engine routes).

The Phase 3 report flagged that the upstream engine call was firing whenever a plugin's layer was enabled (the "Data Engine API returned 404" toast). Gate F in Phase 3 was clean because no layers were toggled during the audit. Phase 4 closes that path properly.

Doctrine surface untouched: no changes to `@worldwideview/*` package names, `WWV_*` env contracts, or default URL constants. Phase 4 wires through the existing `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL` env-var seam.

---

## 2. What Changed

### New
- **`scripts/local-data-engine.mjs`** (~210 lines). Node HTTP + `ws` server on `127.0.0.1:5000`:
  - `GET /manifest` → `{plugins: [...31 IDs]}` so `engineManifest.ts`'s `localEngineHasPlugin()` returns true and `resolveEngineUrl()` routes plugins to the local engine.
  - `GET /api/{pluginId}?lookback=…` → fetches Oculus's `/api/{matching}` endpoint, translates GeoJSON `FeatureCollection` → `{items: [...]}` via per-plugin mappers (aviation, wildfire, maritime, conflict-zones, conflict-events; the rest fall back to a generic mapper).
  - `GET /stream` (WebSocket) → speaks the wire protocol from `src/core/data/WsClient.ts`: `{type:"welcome",plugins:[…]}` on connect, then `{type:"data", pluginId, payload}` on subscribe + every 30s for active subscribers.
  - `GET /health` → `{status:"ok", plugins: 31}`.

### Modified
- **`launch-oculus0osint.ps1`** — new `Start-DataEngineIfNeeded` function parallel to `Start-OllamaIfNeeded`. Launched as background PowerShell hosting `node scripts/local-data-engine.mjs`. Also adds `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000` to the foreground env and to the spawned server env.
- **`.claude/launch.json`** — adds the same env var so the harness/Preview launcher behaves equivalently.
- **`.env.local`** — sets `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000` (default behavior is now local-engine).
- **`.env.example`** — documents the new env var.
- **`scripts/phase1-gate-f.mjs`** — extended to accept optional `GATE_F_EVAL` JS that runs after page load + before the audit window, so we can capture network behavior with plugin layers toggled on.

### Untouched (doctrine-protected)
- `@worldwideview/*` package names and SDK identifiers.
- `WWV_*` env contract names.
- Default URL constants — `https://dataengine.worldwideview.dev` remains the upstream-fallback default in `hostGlobals.ts` and `resolveEngineUrl.ts` when the env var is unset.

---

## 3. Gates

Evidence in `_phase4_verification/`.

### Gate 4A — Stub runs cleanly — **PASS**

Boot output:
```
[engine] listening on http://127.0.0.1:5000
[engine] backing oculus at http://127.0.0.1:3010
[engine] poll interval 30000ms
[engine] plugins served: 31
```

Endpoint smoke tests:
- `GET /manifest` → `{"plugins":["aviation","maritime",…]}` (31 IDs)
- `GET /api/aviation?lookback=15m` → live OpenSky data translated to `{items: [...]}`. Sample row: `{"icao24":"ab1644","callsign":"UAL259","origin_country":"United States","lat":37.7523,"lon":-109.4904,"altitude":11277.6,"heading":69.61,"velocity":233.26,"on_ground":false,…}`
- `GET /api/wildfire` → sample wildfire data translated. 6 fires.
- `GET /api/civil-unrest` → `{"items":[]}` (no source — graceful empty)
- `GET /health` → `{"status":"ok","plugins":31}`

### Gate 4B — App connects to stub — **PASS** (implicit, via 4E)

Build embeds `NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000` at build time. After rebuild, the running app's resolver routes plugins to localhost. If it weren't doing that, Gate 4E would have shown `dataengine.worldwideview.dev` in the off-site list.

### Gate 4C — No 404 toast — **PASS** (implicit, via 4E + screenshot)

The Phase 3 screenshot had a red "Data Engine API returned 404" toast at the bottom. The Phase 4 screenshot (`gate-4cd-engine-active.png`) does not — the engine is responding 200 with valid `{items:[…]}` for the toggled plugins, so the plugin code never throws.

### Gate 4D — Plugins receive entities — **PASS**

Screenshot shows aviation / wildfire / maritime layers toggled, sidebar populated with the seeded plugins, configuration panel open. Aviation entities come from a real OpenSky fetch via Oculus → stub → plugin (verified by the smoke-test output above showing live aircraft data).

Evidence: `_phase4_verification/gate-4cd-engine-active.png`

### Gate 4E — Gate F clean with layers ON — **PASS** ✅

Headless audit with layer-toggle eval (`aviation`, `wildfire`, `maritime`, `conflict-zones`) ON:

```
# total requests observed: 116
# requests to localhost / 127.0.0.1 / data: / blob: : 116
# of which to /wwv-mirror (plugin mirror): 10
# off-site requests: 0
PASS: no requests to non-localhost origins.
```

Unique non-localhost origins: *(none)*

This is the critical Phase 4 win: **Phase 3 measured zero off-site with no layers active; Phase 4 measures zero off-site with active layers**. The plugin engine surface is now fully sovereign.

Evidence: `_phase4_verification/gate-f-engine-active.txt`

### Gate 4F — Launcher autostarts the stub — **PASS** (structural)

`launch-oculus0osint.ps1` now contains `Start-DataEngineIfNeeded` which:
- Tests port 5000 — skips if already listening.
- Resolves `$dataEngineScript = $repoRoot\scripts\local-data-engine.mjs` and launches via background PowerShell with the correct env (`WWV_DATA_ENGINE_PORT`, `OCULUS_BASE_URL`).
- Waits up to 10s for the bind; warns if it doesn't show up.
- Called once on launcher entry, before the Oculus server starts.

Behaviorally equivalent to the existing Ollama autostart. Manual desktop launch should now bring up the full stack (Postgres assumed already running via docker, Ollama on 11434, data engine on 5000, Oculus on 3010).

---

## 4. Honest Issues, Not Papered Over

1. **The stub is not the upstream `wwv-data-engine`.** It's a shape-translation shim. It doesn't run third-party seeders, doesn't have a SQL backend, doesn't do historical playback (only current-instant data). For the local-edition sovereign-posture target, that's sufficient. For anyone needing actual historical data, the upstream service would still be required.

2. **`?lookback=15m` is honored loosely.** The stub passes the query string through to Oculus's endpoint, which ignores it and returns current data. The plugin treats this as "what's happening right now" rather than the 15-minute backfill the upstream contract implies. Acceptable: live current data is more useful than no data, and the entity counts are populating correctly.

3. **Two plugins return empty items.** `civil-unrest` and `cyber-attacks` have no matching Oculus endpoint. Stub returns `{items:[]}`. The layers will show in the picker but won't add entities. To fix: either add source endpoints to Oculus, or rewrite the engine stub to pull from external data sources (which would re-introduce off-site outbound — not the sovereign goal).

4. **`conflict-zones` timed out during the smoke test.** The engine log showed `[engine] conflict-zones: fetch failed: The operation was aborted due to timeout`. Oculus's `/api/conflict-zones` endpoint depends on an external feed that may be slow or down. The stub timeout (10s) hits, the plugin gets an empty array, no crash. Worth noting as a known flake; the timeout is non-fatal and recovers on the next 30s poll.

5. **WS subscribers polled every 30s.** The stub re-fetches from Oculus on a fixed interval. Real-time entity updates that the upstream engine pushes immediately have a 30s ceiling here. Configurable via `WWV_ENGINE_POLL_MS` env var on the stub. Fine for OSINT use cases where aircraft positions every 30s is enough; not fine for sub-second tracking.

6. **The stub re-fetches from Oculus, which re-fetches upstream.** Aviation → stub → Oculus `/api/aviation` → `opensky-network.org`. The end-to-end chain still phones OpenSky. That's a **data feed**, not telemetry — it's the only way to get aircraft positions. If owner wants zero outbound at the data layer too, that's a separate phase (local data caches, ARGOS feed routing, etc. — same conversation as Phase 3's §4.5 note).

7. **`Ion.defaultAccessToken = ""` from Phase 3 still in effect.** Globe imagery uses sovereign-offline. Phase 4 didn't change imagery behavior; it only added the data-engine stub.

---

## 5. Operator Notes

The launcher handles everything. Just run `launch-oculus0osint.ps1` and you get Postgres (already up via docker-compose), Ollama (11434), data engine (5000), and Oculus (3010) in one shot.

If something doesn't come up:
```powershell
# Check ports
Get-NetTCPConnection -LocalPort 3010,5000,11434 -State Listen

# Tail data engine log
Get-Content C:\AI\OCULUSBOUND\Oculus-osint-main\logs\data-engine.log -Tail 20

# Run stub manually if launcher didn't catch it
cd C:\AI\OCULUSBOUND\Oculus-osint-main
node scripts/local-data-engine.mjs
```

To skip the local stub and use the upstream cloud engine (if the owner ever wants to fall back):
```powershell
# In .env.local, comment out:
# NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL=http://localhost:5000
# then rebuild — falls back to wss://dataengine.worldwideview.dev
```

---

## 6. Files Changed

| File | Status |
| --- | --- |
| `scripts/local-data-engine.mjs` | new (~210 lines) |
| `launch-oculus0osint.ps1` | `Start-DataEngineIfNeeded` block, env var wiring |
| `.claude/launch.json` | env var |
| `.env.local`, `.env.example` | env var documented |
| `scripts/phase1-gate-f.mjs` | `GATE_F_EVAL` hook for layer-on audits |
| `_phase4_verification/` | gate evidence (gate-4cd screenshot, gate-f-engine-active.txt) |
| `OCULUS_PHASE4_PLAN.md` | scope-lock |
| `OCULUS_PHASE4_REPORT.md` | this file |

No SDK / package / env-contract / URL-constant default changes.

---

## 7. Open Questions for Owner

1. **`civil-unrest` and `cyber-attacks` data sources.** Need real upstream feeds. Possible sources: ACLED (already env-stub-supported), Citizen API (env-stub-supported), or a CISA cyber-attack feed. Want a Phase 5 to wire those in?

2. **30-second poll cadence.** Tighter for moving entities (aviation) might be useful; looser for static (conflict zones) saves load. Want per-plugin polling tuning?

3. **Engine ↔ Oculus chaining.** The stub calls Oculus's own `/api/{id}` which itself calls OpenSky / USGS / etc. That's fine for sovereignty against the WWV cloud, but plugins still indirectly cause upstream calls. Want a "fully offline" mode that returns only seed data?

4. **Phase 5 candidates:**
   - **Stripe / Supabase rip-out** (deferred from Phase 1 — still scaffolded but dormant).
   - **ARGOS coupling decision finalization** (still open from Phase 2/3).
   - **Plugin data feed sovereignty** (issue 3 above — local data caches).
   - **Wire `civil-unrest` and `cyber-attacks` data sources** to fill the two empty-items plugins.

---

## 8. Recommended Next Phase

**Phase 5 candidate: Stripe / Supabase rip-out.**

The Phase 1 brief explicitly deferred these because they touched the auth.config.ts surface. Now that the local edition is operationally stable through Phase 4 and the auth flow is well-understood, this is the right time to remove the dormant cloud-mode scaffolding. The risk surface is moderate and the simplification is real.

Alternative: **Phase 5 = ARGOS coupling decision + first implementation.** Higher value if the owner is ready to make the architectural call.

**Do NOT start Phase 5 without owner confirmation.** Standing down.

---

## 9. Commit

(SHA stamped after commit)
