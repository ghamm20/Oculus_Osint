# Gate D — Live browser smoke test (owner-driven)

**Status:** AWAITING OWNER. Server is up at `http://127.0.0.1:3010` and
healthy (`/api/health` → `{"status":"healthy"}` confirmed at fix time).

## Steps

1. Open `http://127.0.0.1:3010` in Chrome with DevTools open. Switch
   to the **Issues** tab. Clear any stale items if present.
2. Wait for the globe to render and the data layer to populate.
3. Click 3–5 camera entities across different sources. Mix of:
   - FL511 (Florida traffic)
   - GDOT (Georgia traffic)
   - One other (NY511, WSDOT, ARGOS NRT, etc.)

## Pass criteria

- [ ] At least one camera renders a visible image feed in the
      panel (not just metadata + Play button).
- [ ] **CORB block count drops significantly** in DevTools Issues —
      previously 12, target ≤ a few (ideally 0 if every clicked
      camera happens to have a live upstream). Some non-zero count
      is expected for cameras whose upstream is genuinely offline /
      returning HTML — the new behavior surfaces those as honest
      502s in the Network tab instead of silent CORB blocks.
- [ ] Network tab: requests to `/api/camera/proxy/stream?url=…`
      that previously logged a CORB warning should now show either:
      a 200 with `Content-Type: image/*` (the feed renders), or
      a 502 with `Content-Type: application/json` (the upstream is
      not media — `<img onError>` shows "Stream Failed" cleanly).

## Fail criteria

- [ ] CORB block count stays at 12 → fix didn't reach the route in
      the running build. Most likely cause: build artifact is stale.
      Verify by hitting the proxy via curl (Gate B repro).
- [ ] All cameras error out with "Upstream returned non-media content"
      → unrelated regression where every upstream is mis-typed, or
      the content-type whitelist is too strict (e.g. upstream sends
      `application/jpg` instead of `image/jpeg`). Capture a Network
      tab screenshot showing the response Content-Type that's being
      rejected and post back — easy follow-up fix.

## What's NOT this commit's responsibility

If CORB count drops to ≤ 2–3 but no camera feed actually renders,
the next layer is the upstream itself (CDN hot-link block, IP geo
restriction, etc.) — not auth, not CSP, not CORB. That's
investigation step "3" per prior session notes.

## Outcome (fill in after smoke test)

- Date/time:
- Cameras clicked (entity IDs or descriptions):
- CORB block count: before 12, after ___
- Feeds that rendered visibly: ___
- Feeds that showed "Stream Failed" overlay (expected for offline upstreams): ___
- DevTools console errors (paste):
- Verdict: PASS / FAIL
