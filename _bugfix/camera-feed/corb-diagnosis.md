# Camera-feed bug — CORB & CSP diagnosis (read-only)

**Status:** static analysis only. No code changes. Confidence on CORB
root cause: high. Confidence on the single CSP "blocks some resources"
warning: medium — need the exact blocked URL from the operator's
DevTools Issues panel to pin it down to a directive.

---

## Part 1 — CORB blocks (12 instances)

### How camera images flow

1. `CameraStream.tsx` (truthy `streamUrl`, not HLS, not iframe-platform) renders
   `<img src={getProxiedStreamUrl(fallbackUrl)} ... />`.
2. `streamUtils.getProxiedStreamUrl` rewrites every URL to
   `/api/camera/proxy/stream?url=<encoded upstream>` — comment line 72:
   *"Always proxy to bypass CORS restrictions from camera providers!"*
3. Browser fetches the proxy URL as a same-origin `<img>` subresource.
4. `src/app/api/camera/proxy/stream/route.ts` GETs the upstream and
   pipes the body back to the browser.

### Current response shape

Lines 117–125 of `src/app/api/camera/proxy/stream/route.ts`:

```ts
return new Response(upstream.body as ReadableStream, {
    status: 200,
    headers: {
        "Content-Type": contentType,                      // upstream's CT, or "application/octet-stream"
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
});
```

Where `contentType` (line 114) is:

```ts
const contentType = upstream.headers.get("content-type") || "application/octet-stream";
```

Mechanically this is good: pass-through body (no buffering), upstream
Content-Type preserved, `nosniff` set, ACAO permissive. For a healthy
image upstream returning `Content-Type: image/jpeg`, Chrome's ORB/CORB
allows it into an `<img>`.

### Why CORB is firing anyway

Chrome's CORB / ORB (the post-2023 evolution) blocks a response when
*any* of the following is true for a request loaded as image/script/font:

| Condition | Result |
| --- | --- |
| Content-Type is HTML / XML / JSON / multipart | **block** (regardless of nosniff) |
| Content-Type is missing / `application/octet-stream` and sniffing detects HTML/XML/JSON | **block** |
| Content-Type starts with `text/` (esp. `text/plain`, `text/html`) loaded as `<img>` | **block** |
| Content-Type is `image/*` / `video/*` / `audio/*` / known binary | allow |

The proxy faithfully forwards whatever Content-Type the upstream sets.
The 12 CORB blocks are upstream cameras whose responses are one of:

1. **HTML error pages disguised as 200 OK** — a CDN or ArcGIS server
   returns a styled error page (`Content-Type: text/html`) instead of
   404/503 when the camera is offline. Proxy copies `text/html` into
   the response → CORB blocks because the browser loaded it as `<img>`.
2. **Stream URLs that point at a landing page, not the image bytes** —
   FL511's `IMAGE` field is sometimes a webpage embedding the camera
   feed, not a direct `.jpg`. Proxy returns `text/html`, CORB blocks.
3. **Missing Content-Type entirely** — old MJPEG servers occasionally
   omit it. Proxy returns `application/octet-stream`. Chrome's
   confirmation sniffer reads the first ~1024 bytes; if they look like
   `<!doctype` or `{...}` or `<?xml`, CORB blocks.

The "12 blocks correlates with the missing camera feeds" symptom
matches scenario 1 / 2 directly: cameras whose upstream is offline or
not actually an image URL → text/html → CORB → `<img onError>` →
"Stream Failed" overlay.

### Recommended fix shape (NOT YET IMPLEMENTED)

In `src/app/api/camera/proxy/stream/route.ts`, after fetching the
upstream:

1. **Whitelist Content-Type for image contexts.** Accepted prefixes:
   `image/`, `video/`, `audio/`, `multipart/x-mixed-replace`. Also
   accept `application/octet-stream` IF the first few bytes are a
   recognized image magic number (JPEG `FF D8`, PNG `89 50 4E 47`,
   GIF `47 49 46`, WEBP `52 49 46 46 ... 57 45 42 50`). If neither,
   return a 502 with `Content-Type: application/json` and an error
   body — the `<img onError>` handler already deals with that path
   and shows the "Stream Failed" overlay cleanly (not CORB-blocked,
   because 502 + JSON + nosniff is fine for `<img>` failure paths).
2. **Strip `text/*` content-types** from the relay — never forward
   `text/html` / `text/plain` / `text/xml` into the response of a
   route the browser loads via `<img>`.
3. **Optionally normalize MIME** — if upstream sends a quirky
   `application/jpeg` instead of `image/jpeg`, rewrite to the
   canonical form. (Low priority — modern Chrome accepts both.)
4. **Keep the rest unchanged**: nosniff, ACAO, pass-through stream.

The CORB block becomes an honest 502 in the browser logs, the `<img>`
errors cleanly, and the camera panel shows "Stream Failed" instead of
a silent CORB-block. That's the right UX: cameras with offline
upstreams should fail visibly, not silently.

### Scope of fix

Only `stream/route.ts` needs the content-type guard. The other two:

- `iframe/route.ts` legitimately returns `text/html` because it serves
  `<iframe>` contexts — and `<iframe>` isn't a CORB-protected request
  type. No change needed.
- `proxy/route.ts` returns `application/json` (via `NextResponse.json`)
  to fetcher/server callers, not `<img>` callers. No change needed.

### Hard call-outs

- The proxy currently rate-limits via `cameraProxyLimiter` and does
  *not* enforce the SSRF block (commented out per a prior "By user
  request" decision in stream/route.ts:83–92). The CORB fix should
  NOT touch that decision either way — purely a content-type concern.
- The fix must NOT modify the upstream `<img>` consumption path or
  any plugin / mirror code (MPL-licensed plugin bundles are off-limits
  per standing constraint).

---

## Part 2 — single "CSP blocks some resources" warning

### Current CSP directives

From `next.config.ts:32–44` (verified identical to compiled
`routes-manifest.json`):

```
default-src 'self'
script-src   'self' 'unsafe-eval' 'unsafe-inline' blob:
style-src    'self' 'unsafe-inline' fonts.googleapis.com
font-src     'self' fonts.gstatic.com
img-src      'self' data: blob: http: https:
connect-src  'self' http: https: ws: wss:
media-src    'self' blob: http: https:
frame-src    'self' http: https: blob:
worker-src   'self' blob:
frame-ancestors 'none'
```

### What is NOT the culprit

- **img-src** — already wide open (`http:`, `https:`). Camera image
  fetches cannot trip this. (And they hit `/api/camera/proxy/stream`
  which is `'self'` anyway.)
- **connect-src** — wide open (`http:`, `https:`, `ws:`, `wss:`).
  HLS .m3u8 fetches, plugin data fetches, WebSocket to data engine,
  ARGOS chat to 127.0.0.1:7799 — all covered.
- **frame-src / media-src** — wide open.

### Most likely culprits, in order

The 1 "blocks some resources" warning maps to one of:

1. **`style-src`** — `'self' 'unsafe-inline' fonts.googleapis.com`.
   Only allows local stylesheets and Google Fonts CSS. If any plugin
   bundle (or a Cesium widget config) tries to `<link rel="stylesheet"
   href="https://other-cdn/...">` the load is blocked.
2. **`font-src`** — `'self' fonts.gstatic.com`. Only allows local
   fonts and Google Fonts files. A `@font-face` rule (from a plugin
   or Cesium widget CSS) pointing at any other host would block.
3. **`worker-src`** — `'self' blob:`. Allows local workers and
   blob workers (hls.js uses blob). If hls.js or a plugin tried to
   spawn a Worker from `https://`, it'd block. Cesium workers live
   at `/cesium/Workers/...` which is `'self'`, so Cesium is fine.
4. **`default-src 'self' fallback`** — `manifest-src`, `prefetch-src`,
   `child-src` all fall through to `default-src 'self'`. A
   `<link rel="manifest">` or `<link rel="preconnect">` to a
   third-party origin would block.

### Recommended next step (NOT YET IMPLEMENTED)

The exact blocked URL is required to pin the directive. In the
operator's DevTools:

1. Open DevTools → Issues tab → expand the "Content Security
   Policy of your site blocks some resources" item.
2. Note the *Resource* URL and the *Directive* column (e.g.
   `style-src-elem`, `font-src`, `worker-src`).
3. Send that pair back. The fix is then a targeted
   widening of *that one directive* to add the specific origin
   (NOT a `*` wildcard, NOT `http: https:` for `style-src` or
   `font-src` — keep those tight because they're sovereign-Gate-F
   relevant).

If the resource turns out to be:
- A Google-hosted style/font we already allow — likely a 3rd-party
  CDN mismatch; fix is to use the canonical Google host or proxy.
- A Cesium-related asset on `cesium.com` — fix is to add the host
  to the specific directive. But this is unlikely; Cesium ships
  bundled assets in `/cesium/` which is `'self'`.
- A plugin bundle's external CDN reference (e.g. font from
  `fonts.fontawesome.com`) — fix is to either add the host to
  `style-src` / `font-src` or to vendor the font locally.

No CSP changes should land in this commit pass until the operator
shares the exact blocked URL. The CSP is otherwise sovereign-Gate-F-clean and any wildcard widening would regress that posture.

---

## Summary — what to ship

| Fix | Scope | Confidence | Status |
| --- | --- | --- | --- |
| Stream proxy content-type guard | `src/app/api/camera/proxy/stream/route.ts` only | High | Awaiting owner approval |
| CSP directive widening | None yet — need blocked URL | n/a | Blocked on owner input |

The CORB fix is independent of the CSP question and can ship by
itself. The CSP warning is 1 instance; the 12 CORB blocks are the
*camera-feed-not-rendering* root cause for image upstreams.
