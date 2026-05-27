# Gate 1 — Fix A code review

**Scope:** `src/components/video/CameraStream.tsx` (early-return guard against null/empty `streamUrl`).

**Verdict:** PASS.

## Checklist

| # | Check | Result | Notes |
| --- | --- | --- | --- |
| 1 | Guard placed **before any hook call** (no hook-order violation) | PASS | `if (!streamUrl) return null;` sits at line 36, before the first `useState` at line 38. |
| 2 | Component signature accepts `null` and `undefined` for `streamUrl` | PASS | Prop type widened to `string \| null \| undefined` in `CameraStreamProps`. |
| 3 | Early return path renders **nothing** — caller decides empty-state UI | PASS | Returns `null`. Confirmed with diagnosis: `CameraDetail` is the slot, and other plugin UI continues to render around it. |
| 4 | Hook-ordering stability across mounts | PASS | A given `CameraStream` instance has stable props for its mount lifetime (caller `CameraDetail` constructs a fresh instance per entity). Either every render takes the early return or none do — hook order is consistent within a single mount. |
| 5 | No change to existing render paths when `streamUrl` is truthy | PASS | Only the new line was added; downstream `useState` / `useEffect` / `renderStreamContent` are byte-identical. |
| 6 | No change to visual styling | PASS | No CSS, no JSX changes inside the truthy branch. |
| 7 | TypeError previously thrown at `streamUrl.includes("balticlivecam.com")` cannot fire | PASS | The crash site at line 53 (formerly 37) is unreachable when `streamUrl` is falsy because the early return runs first. |
| 8 | No new dependencies introduced | PASS | Pure-React change. |
| 9 | Upstream WWV plugin contract unchanged | PASS | `CameraStream` is exposed via `globalThis.__WWV_HOST__.CameraStream`; signature stays compatible (widened, not narrowed). |
| 10 | Comment block explains the placement decision for future readers | PASS | 7-line comment above the guard documents why it sits before hooks. |

## Risk assessment

- **Hook-order regression:** none. Guard is unconditional on falsy `streamUrl`. A given mount always takes the same branch.
- **Plugin compatibility:** the camera plugin bundle calls `<CameraStream streamUrl={n} previewUrl={r} />` where `n = t.stream` (sometimes null) and `r = t.preview_url` (sometimes undefined). Both inputs already flow through this component without modification — only the crash on the first hook deref is removed.
- **Visual regression:** none. When `streamUrl` is null, the parent `CameraDetail` slot now renders empty cleanly instead of being silently replaced by the error-boundary fallback (also empty). Same visual outcome; honest failure mode instead of silent crash.

## What this gate does NOT prove

This is a static review only. End-to-end confirmation that an FL511 camera click actually shows a feed lives in Gate 4 (smoke test). Gate 1 only proves Fix A is internally consistent and safe.
