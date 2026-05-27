# Gate 2 — Camera adapter audit (Fix B)

**Scope:** every camera fetcher under `src/app/api/camera/*/`. Verify each either drops null-stream entities at the adapter level or already does. Confirm skip-count logging is in place.

**Verdict:** PASS — all 10 adapters now guard against null/empty `stream`, and 9 of 10 emit a skip-count `console.info` line on each fetch cycle (WSDOT was already silently guarding without a count line; behaviorally clean either way).

## Adapter-by-adapter

| Adapter | File | Pre-fix behavior | Post-fix behavior | Status |
| --- | --- | --- | --- | --- |
| **fl511-public** | `fl511Public/fl511PublicFetcher.ts` | `stream: image \|\| null` — emitted entities with `stream: null` (PRIMARY OFFENDER for this bug) | `if (!image) return null;` at line ~67. `stream: image`, `streamType: "image"`. Skip-count logged from `fetchFl511PublicCameras`. | FIXED |
| **caltrans** | `caltrans/caltransFetcher.ts` | `stream: hls \|\| jpeg` — empty string when both missing | `if (!stream) return null;` before properties return. Skip-count logged from `fetchCaltransCameras` (covers offline + no-stream). | FIXED |
| **chart-md** | `chart/chartFetcher.ts` | `stream: c.publicVideoURL ?? ""` — empty string fallback | `if (!stream) return null;` before properties return. Skip-count logged from `fetchChartCameras`. | FIXED |
| **fl511** | `fl511/fl511Fetcher.ts` | `stream = hls \|\| c.ImageUrl \|\| c.Url \|\| ""` — empty string fallback | `if (!stream) return null;` after `stream` assignment. Skip-count logged from `fetchFl511Cameras`. | FIXED |
| **gdot** | `gdot/gdotFetcher.ts` | `stream: a.HLS \|\| a.url \|\| ""` — empty string fallback | `stream = a.HLS \|\| a.url \|\| ""; if (!stream) return null;`. Skip-count logged from `fetchGdotCameras`. | FIXED |
| **ny511** | `ny511/ny511Fetcher.ts` | `stream: hls \|\| c.Url \|\| ""` — empty string fallback | `stream = hls \|\| c.Url \|\| ""; if (!stream) return null;`. Skip-count logged from `fetch511NyCameras`. | FIXED |
| **ohgo** | `ohgo/ohgoFetcher.ts` | `stream = view.LargeUrl \|\| view.SmallUrl \|\| ""` — empty string fallback (per-view) | `if (!stream) return null;` after `stream` assignment in `toFeature`. Skip-count logged from `fetchOhgoCameras` (counts upstream views). | FIXED |
| **tfl** | `tfl/tflFetcher.ts` | `stream: videoUrl \|\| imageUrl \|\| ""` — empty string fallback | `stream = videoUrl \|\| imageUrl \|\| ""; if (!stream) return null;`. Skip-count logged from `fetchTflCameras`. | FIXED |
| **tn-smartway** | `tnsmartway/tnSmartWayFetcher.ts` | `stream = hls \|\| thumbnail \|\| null` — emitted entities with `stream: null` | `if (!stream) return null;` after `stream` assignment. Skip-count logged from `fetchTnSmartWayCameras`. | FIXED |
| **wsdot** | `wsdot/wsdotFetcher.ts` | Already guarded by `if (!c.ImageURL) return null;` at line 47 | No change required. Silent guard (no skip-count) preserved — does not regress this fix. | ALREADY OK |

## Other camera-shape files reviewed (not adapters, no change needed)

- `src/app/api/camera/adapters/types.ts` — type definitions only.
- `src/app/api/camera/adapters/fl511Public.ts`, `caltrans.ts`, `chart.ts`, `fl511.ts`, `gdot.ts`, `ny511.ts`, `ohgo.ts`, `tfl.ts`, `tnSmartWay.ts`, `wsdot.ts` — thin wrappers that call the fetchers via `.fetch =`. They don't construct features themselves.

## What this change protects

The bug shows up when *any* fetcher emits a camera entity with `properties.stream === null` or `properties.stream === ""`. The camera plugin's `CameraDetail` component (`public/wwv-mirror/plugins/@worldwideview/wwv-plugin-camera@1.0.12/dist/frontend.mjs`) reads `t.stream` and passes it straight to `<CameraStream streamUrl={n} />`. Pre-fix, the FL511-PUBLIC adapter was the only confirmed source of `null` streams in the wild — but the audit found that several other adapters (gdot, chart, fl511, ny511, ohgo, tfl, caltrans) would emit empty-string streams under the right upstream conditions, which would have led to the same broken-detail-pane class of bug as soon as those upstreams produced sparse rows.

Fix A in `CameraStream.tsx` already covers both `null` and `""` (the early return uses `!streamUrl`). Fix B is defense in depth: useless dots on the globe with no feed are never shown to the operator in the first place. Each adapter now also logs how many upstream rows it dropped per cycle, giving the operator a clear signal when upstream data quality degrades.

## What this gate does NOT prove

That every adapter's *upstream* API actually produces null/empty streams. Several adapters guard against patterns that may or may not appear in real responses. Logging the skip count makes that observable in production rather than guesswork.
