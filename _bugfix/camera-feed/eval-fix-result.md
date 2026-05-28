# Camera-feed "eval blocked" investigation — actual root cause

## TL;DR

The CSP `'unsafe-eval'` hypothesis was wrong. CSP has allowed `'unsafe-eval'`
continuously since the original fork-prep commit, and no plugin bundle
actually uses `eval(` or `new Function`. The "eval blocked" indicator in
Chrome's Issues panel was flagging `'unsafe-eval'` as a CSP-policy
weakness (severity = Issue, not Block) — common DevTools behavior even
when nothing is being blocked.

The real reason camera feeds never rendered after the prior marketplace
401 bypass landed (068a274): the three camera-proxy routes still gated on
`auth()` and ignored `WWV_DEV_NO_AUTH`. Every camera image the plugin
tried to render went through `/api/camera/proxy/stream` (see
`streamUtils.getProxiedStreamUrl`, comment "Always proxy to bypass CORS")
and was returning 401. The `<img onError>` handler fired, the "Stream
Failed" overlay rendered, and the operator saw metadata-only.

## Evidence — CSP is not the culprit

1. **Source:** `next.config.ts:32` reads
   `script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:`
2. **Git history:** `git log -p --all -S "unsafe-eval" -- next.config.ts` shows
   `'unsafe-eval'` continuously present since `f2fb8d7` (initial fork prep).
   Phase 2 commit `20bcd47` only removed CDN host grants (unpkg, jsdelivr,
   analytics). Phase 3 did not touch `next.config.ts` at all.
3. **Compiled output:** `.next/routes-manifest.json` has the compiled
   `Content-Security-Policy` header value with `'unsafe-eval'` present.
4. **No other CSP source:** repo-wide grep for `Content-Security-Policy`
   matches only `next.config.ts` plus historical phase reports. No
   middleware injects a CSP. No meta tag does either.
5. **Plugin bundles do not use eval:** `grep -lE "eval\(|new Function"`
   across all 30 mirrored `frontend.mjs` files → zero matches. The
   plugin loader uses dynamic `import()`.

## Fix shape (delta from brief)

Brief asked to gate `'unsafe-eval'` behind `WWV_DEV_NO_AUTH`. That would
be a no-op when the flag is on (it's already there) and a regression
when the flag is off (Cesium worker compilation needs eval). With owner
sign-off via AskUserQuestion, the change pivoted to the analogous
camera-proxy auth bypass — same opt-in shape as `068a274`.

Three routes updated:

| Route | File | Change |
| --- | --- | --- |
| `GET /api/camera/proxy` | `src/app/api/camera/proxy/route.ts` | When `auth()` returns no session, fall through to the dev bypass if `WWV_DEV_NO_AUTH === "true"`; warn-log the bypass. |
| `GET /api/camera/proxy/stream` | `src/app/api/camera/proxy/stream/route.ts` | Same shape. This is the route every camera `<img>` actually hits. |
| `GET /api/camera/proxy/iframe` | `src/app/api/camera/proxy/iframe/route.ts` | Same shape. For embeddable platform iframes. |

`.env.example` updated to enumerate the third bypass scope so future
operators can see the full surface.

## Static checks

- [x] TypeScript: `tsc --noEmit -p tsconfig.json` → exit 0
- [x] All three routes retain default-deny behavior when `WWV_DEV_NO_AUTH`
      is unset — the bypass only runs after the auth check fails AND the
      env flag is literal "true".
- [x] Each bypass logs a route-tagged warning matching the proxy.ts /
      validateMarketplaceAuth pattern.
- [x] SSRF guard (private-IP block) in `route.ts` and the
      commented-out one in `stream/route.ts` (owner-disabled per route
      comment "By user request") are unchanged.

## Live verification — deferred

Same pattern as the prior camera-feed and marketplace-401 commits:
app stack not running at fix time (Docker Desktop down per prior turn,
Postgres container not started). Acceptance criteria for the next
bring-up:

1. Start the stack (Docker → Postgres → `launch-oculus0osint.ps1`)
2. In browser DevTools, with `WWV_DEV_NO_AUTH=true` and no signed-in
   session, click an FL511 camera that actually has an `IMAGE` field
   (e.g. an entity whose `properties.stream` resolves to an
   `https://images-dim.divas.cloud/...` URL after the fl511PublicFetcher
   normalization).
3. Expect:
   - Camera detail panel renders metadata as before
   - The `<img>` inside `<CameraStream>` loads (no 401 on
     `/api/camera/proxy/stream?url=...`)
   - DevTools Network shows `/api/camera/proxy/stream` returns 200
   - Server log shows
     `[camera/proxy/stream] WWV_DEV_NO_AUTH=true — bypassing auth ...`
   - No `[PluginErrorBoundary]` errors

If a feed still does not render after the proxy bypass, the next
investigation step is upstream-server behavior (e.g. CDN 403 / hot-linking
block on `divas.cloud`, MJPEG stream that needs a long-lived connection
and is hitting `MAX_STREAM_DURATION_MS`, etc.) — and at that point the
fix would be operational (configure the upstream / extend timeout), not
auth-related.
