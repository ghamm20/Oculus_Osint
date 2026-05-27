# Marketplace 401 — fix verification

## Problem

`MarketplaceSync` was failing with 401s on `/api/marketplace/load` (and the
same applied to `/api/marketplace/status`) even though `WWV_DEV_NO_AUTH=true`
was set. The proxy bypass only covered page routes; API route handlers
called `validateMarketplaceAuth` directly, which only honored sessions and
bearer tokens. With no session and no marketplace JWT, the loader returned
401, the plugin bundles never loaded, and the camera plugin's `CameraDetail`
component was never registered — which is why clicking a camera entity
showed metadata but no feed.

## Fix shape

`validateMarketplaceAuth` now accepts an opt-in `{ allowDevBypass: true }`
option. When set AND `WWV_DEV_NO_AUTH === "true"` AND neither a session nor
a valid bearer token is present, it logs a warning matching the proxy.ts
pattern and returns `null` (allow through). When `allowDevBypass` is not
passed (the default), behavior is byte-identical to before.

Opt-in callers (read-only only):

| Route | Reason |
| --- | --- |
| `GET /api/marketplace/load` | Plugin manifest list — needed for camera + every other dynamic plugin to register at startup. Read-only. |
| `GET /api/marketplace/status` | Installed-plugin status poll. Same loader code path. Read-only. The "can manage" probe inside this route deliberately does NOT pass allowDevBypass — that check needs a real session. |

NOT opted in (stay gated):

| Route | Reason |
| --- | --- |
| `POST /api/marketplace/install` | Writes plugin records to the DB |
| `POST /api/marketplace/uninstall` | Removes plugin records |
| `GET /api/marketplace/grant-token` | Issues marketplace JWTs (uses `auth()` directly, not `validateMarketplaceAuth`) |
| `GET /api/marketplace/install-redirect` | Issues marketplace JWTs + writes plugin records |
| `POST /api/marketplace/sideload` | Already gated by `NODE_ENV !== "development"` |
| `GET /api/marketplace/disabled-builtins` | Already public (rate-limit only) |
| `GET /api/marketplace/check-updates` | Already public (rate-limit only) |

## Static checks performed

- [x] `validateMarketplaceAuth` change is additive — default option `{}` retains exact prior behavior. Two existing call sites (`install/route.ts`, `uninstall/route.ts`) keep their unmodified calls and remain fully gated.
- [x] Only the read-only `load` and `status` endpoints pass `{ allowDevBypass: true }`. Grep confirms no other call site.
- [x] Dev bypass requires BOTH conditions: caller opt-in AND env flag literal "true". A typo'd `WWV_DEV_NO_AUTH=1` will not trigger the bypass.
- [x] Warning fires on every bypassed request and includes the path (`url.pathname`), matching the proxy.ts pattern.
- [x] Status route's `canManagePlugins` probe inside the `isDemo` branch deliberately omits `allowDevBypass` — otherwise it would falsely advertise manage permissions to anonymous demo visitors.
- [x] TypeScript compiles cleanly: `tsc --noEmit -p tsconfig.json` → exit code 0.

## Live verification — DEFERRED

App stack not running at fix time (Docker Desktop is down, Postgres + Next.js are down; only Ollama is listening on 11434). Per prior session pattern with the Docker stale-reparse-point incident, autonomously cycling Docker Desktop in the background was the wrong call. The static analysis above is conclusive on the behavior change.

When the stack is next online, run the smoke test:

```powershell
cd C:\AI\OCULUSBOUND\Oculus-osint-main
.\launch-oculus0osint.ps1
```

Expected on first request to `/api/marketplace/load` (without signing in):

```
[marketplace/auth] WWV_DEV_NO_AUTH=true — bypassing auth for /api/marketplace/load. Unset this env to re-enable the marketplace auth gate.
```

Then in browser DevTools on `http://127.0.0.1:3010`:
- [ ] No `401 Unauthorized` on `/api/marketplace/load`
- [ ] No `401 Unauthorized` on `/api/marketplace/status`
- [ ] `[MarketplaceSync]` console line shows success (not "Sync failed")
- [ ] Plugin bundles fetched from `/wwv-mirror/plugins/...` succeed (200s)
- [ ] Camera entity click renders a feed for at least one FL511 or GDOT camera
- [ ] `[marketplace/auth] WWV_DEV_NO_AUTH=true — bypassing auth ...` warning appears in the Next.js server logs

Save the resulting screenshot + console excerpt to this directory if you want a permanent verification artifact.

## What this fix is NOT

- Not a permanent change. `WWV_DEV_NO_AUTH=true` must be unset before any external view or before the "Phase 8 endpoint complete" milestone — discipline check in OCULUS_PHASE8_PLAN.md still applies.
- Not a bypass for install/uninstall. Plugin installation through the UI will still fail without a session even when the bypass env is on. That is intentional.
- Not a fix for the underlying camera-feed crash. That was the previous commit (`7e1cf65`). This fix just unblocks the plugin from loading at all.
