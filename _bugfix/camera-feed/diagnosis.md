# Camera-feed bug — diagnosis (static analysis)

**Bug:** Click an FL511-PUBLIC camera → metadata panel populates (lat/lon, source, route, timestamp, Face/Go To/Lock buttons) but **no feed preview appears anywhere on screen**.

**Status:** read-only analysis. No edits. Confidence: high. DevTools repro deferred — app on `:3010` not currently running (only Ollama `:11434` listening), so network/console capture pending.

---

## Root cause

`src/components/video/CameraStream.tsx` line 37:

```ts
useEffect(() => {
    setIsPlaying(false); ...
    setActiveStreamUrl(streamUrl);

    if (streamUrl.includes("balticlivecam.com")) {       // ← unguarded
        ...
    }
}, [streamUrl]);
```

`streamUrl.includes(...)` throws **`TypeError: Cannot read properties of null (reading 'includes')`** when `streamUrl` is `null`.

Many FL511-PUBLIC camera entities arrive with `streamUrl === null`. The component crashes during render, the surrounding `<PluginErrorBoundary>` swallows the exception and returns `null` (its by-design fallback), the DetailComp slot collapses to empty. The user sees the surrounding IntelTab UI (which renders before and after the DetailComp slot) but no feed preview.

## Why streamUrl is null for FL511-PUBLIC entities

`src/app/api/camera/fl511Public/fl511PublicFetcher.ts:68`:

```ts
properties: {
    id,
    stream: image || null,           // null when upstream IMAGE field is empty/missing
    hls: null,
    streamType: image ? "image" : null,
    ...
    // preview_url: NOT SET at all
}
```

The camera plugin bundle (`public/wwv-mirror/plugins/@worldwideview/wwv-plugin-camera@1.0.12/dist/frontend.mjs`) defines its detail component as:

```js
var V = ({ entity: e }) => {
    let { properties: t } = e,
        n = t.stream,        // → null for image-less FL511 cameras
        r = t.preview_url,   // → undefined (adapter never sets this field)
        i = t.city, a = t.region, o = t.country,
        s = !!t.is_iframe,
        c = t.categories || [];
    return B("div", { ... children: [
        z(L, {  // L = globalThis.__WWV_HOST__.CameraStream
            id: e.id,
            streamUrl: n,        // ← null gets passed straight through
            previewUrl: r,       // ← undefined
            isIframe: s,
            label: i || o
        }),
        ...
    ]});
};
```

The plugin passes `null` to `<CameraStream streamUrl={null} />`. CameraStream's first `useEffect` deref-crashes on `null.includes(...)`.

## Render call chain (verified)

1. `InteractionHandler.ts:61` — `setSelectedEntity(entity)` on click.
2. `src/components/panels/DataConfig/IntelTab.tsx:295` — `const DetailComp = managed?.plugin.getDetailComponent?.()`. For "camera" plugin, returns the bundle's `CameraDetail`.
3. `IntelTab.tsx:349-354` — renders inside a `PluginErrorBoundary`:
   ```jsx
   {DetailComp ? (
       <div className="intel-panel__custom-detail" ...>
           <PluginErrorBoundary pluginId={selectedEntity.pluginId}>
               <DetailComp entity={selectedEntity} />
           </PluginErrorBoundary>
       </div>
   ) : <DynamicPropertiesRender entity={selectedEntity} />}
   ```
4. `CameraDetail` renders `<CameraStream streamUrl={null} />`.
5. `CameraStream.tsx:37` throws `TypeError: Cannot read properties of null (reading 'includes')`.
6. `PluginErrorBoundary` catches:
   ```ts
   componentDidCatch(error, errorInfo) {
       console.error(`[PluginErrorBoundary] Plugin component 'camera' crashed during render and was isolated:`, error);
   }
   render() {
       if (this.state.hasError) return null;  // ← empty slot
       ...
   }
   ```
7. IntelTab continues rendering Face / Go To / Lock buttons (which sit outside the error boundary). User sees those, plus the metadata fields that render before the DetailComp slot.

## Why the user sees what they see

| Element user sees | Source |
| --- | --- |
| Entity title + source badge | IntelTab header (lines ~310-320), pre-DetailComp |
| lat/lon, altitude, timestamp | IntelTab pre-DetailComp props (lines ~322-348) |
| Face / Go To / Lock buttons | IntelTab `intel-panel__actions` div, post-DetailComp |
| **Camera feed (missing)** | Should be inside DetailComp slot. ErrorBoundary returns `null`. |

This explains both symptoms exactly: the metadata path renders normally, the plugin-rendered feed path silently fails.

## Scope of the bug

This is **not** FL511-Public-specific. Any camera entity where the upstream source returns a null/empty stream URL will trigger the same crash. Candidate adapters where `stream: image || null` or similar patterns produce null entities:

- `src/app/api/camera/fl511Public/fl511PublicFetcher.ts:68` (confirmed)
- Any other adapter that produces entities with `properties.stream` falsy — needs a grep pass.

Symptoms vary slightly: any camera entity whose `stream` field happens to be a populated string would *not* crash, so this bug shows up only on the subset of cameras with missing-image upstream rows. Likely most FL511-PUBLIC cameras hit it because FDOT's IMAGE field is sparsely populated.

## Proposed fixes (no edits performed; awaiting owner sign-off)

**Fix A — primary, surgical.** `src/components/video/CameraStream.tsx` line 36-50: guard the `useEffect` against falsy `streamUrl`. Early-return with a "no stream available" placeholder instead of crashing.

```ts
useEffect(() => {
    setIsPlaying(false); setError(null); setIsLoading(false); setHlsFailed(false);
    setActiveStreamUrl(streamUrl);

    if (!streamUrl) return;   // ← add this line

    if (streamUrl.includes("balticlivecam.com")) {
        ...
    }
}, [streamUrl]);
```

Plus a top-level guard in the render path to show a useful empty-state instead of an unclickable Play button against null:

```ts
if (!streamUrl) {
    return (
        <div className={className} style={{ /* same 16:9 dark box */ }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
                No stream URL provided for this camera
            </span>
        </div>
    );
}
```

**Fix B — defense in depth at the adapter** (separate commit, optional).
`src/app/api/camera/fl511Public/fl511PublicFetcher.ts`: when `image` is empty/null, skip emitting the entity entirely (return `null` from `toGeoJsonFeature`). A camera with no stream is not actually useful on the globe.

Pick A alone for the minimal fix; A+B for the cleaner long-term shape (no useless dots on the globe).

## What's not the bug

Ruled out by static analysis:
- ✗ Plugin not loading. `getDetailComponent` definitely returns a component (visible in the minified bundle).
- ✗ `globalThis.__WWV_HOST__.CameraStream` not exposed. `src/core/plugins/hostGlobals.ts:14,26,51` confirms it's wired.
- ✗ Property field-name mismatch. Plugin reads `t.stream`; adapter writes `stream`. They match.
- ✗ CSP blocking the stream resource. CSP wildcards `http:` / `https:` are wide open for img / connect / media.
- ✗ Auth gate. `WWV_DEV_NO_AUTH=true` is set; the panel renders for unauth users.
- ✗ Wrong IntelTab being rendered. Live IntelTab is `src/components/panels/DataConfig/IntelTab.tsx` (imported by `DataConfig/index.tsx`); the two other copies in `config/` and `tabs/` are stale.

## DevTools reproduction — pending

Brief asks for `_bugfix/camera-feed/network-trace.txt` and `_bugfix/camera-feed/console.txt`. App on `:3010` is not currently running (`Get-NetTCPConnection -LocalPort 3010` returns nothing). Need to start it first:

```powershell
cd C:\AI\OCULUSBOUND\Oculus-osint-main
.\launch-oculus0osint.ps1
```

Then via Chrome MCP or DevTools, click an FL511 camera and capture:
- Console: should show `[PluginErrorBoundary] Plugin component 'camera' crashed during render and was isolated: TypeError: Cannot read properties of null (reading 'includes')`
- Network: probably **no** stream-related requests fire because the crash happens before any fetch. The metadata panel populates from the `/api/camera/list` data already loaded.

The console line is the smoking gun that confirms diagnosis.

## Asks

1. Want me to start the app and capture the DevTools traces to confirm before editing? (Probably yes — the brief explicitly asked for them.)
2. After confirmation, accept Fix A alone, or A + B?
3. Should the "No stream URL provided" placeholder be more aggressive (e.g. don't render the CameraStream wrapper at all, render the generic property list instead)? Owner UX call.
