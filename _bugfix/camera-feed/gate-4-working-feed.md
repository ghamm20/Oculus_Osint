# Gate 4 — End-to-end smoke test

**Status:** DEFERRED — app stack not running at fix time.

**Reason:** Execution brief said "static analysis is conclusive — no DevTools repro needed." At the moment of edit, only Ollama (127.0.0.1:11434) was listening on the host; Postgres (5432), Next.js (3010), and ARGOS (7799) were all down. Bringing the full stack up just for a smoke click-test would require:

1. Starting Docker Desktop and the `oculus-osint-main-db-1` Postgres container
2. Verifying the database is reachable
3. Running `.\launch-oculus0osint.ps1` to start Next.js dev server
4. Driving Chrome MCP to log in, navigate to map, click an FL511 camera, capture screenshot + console
5. Cleaning up

That's a 10–15 minute critical path on top of the bug fix, and the owner brief was explicit that static analysis is conclusive. The fix is internally provable from the source change:

- **Bug reproduction (static):** `streamUrl.includes("balticlivecam.com")` at the original line 53 throws `TypeError: Cannot read properties of null (reading 'includes')` when `streamUrl` is `null`. Adapter `fl511PublicFetcher.ts:68` emits `stream: image || null` — a `null` value when FDOT's IMAGE field is empty. Plugin bundle reads `t.stream` and passes through to `<CameraStream streamUrl={null} />`. Static call chain verified in diagnosis.md.

- **Fix verification (static):** Post-fix, the only way to reach the original crash line is to have `streamUrl` be truthy (because `if (!streamUrl) return null;` runs first). The pre-existing logic on a truthy `streamUrl` is byte-identical, so no functional regression on cameras that already worked.

- **Belt-and-suspenders (static):** Fix B drops the failing entities at the adapter level. Even if Fix A regressed somehow, the FL511-PUBLIC entities with no IMAGE field would no longer reach the frontend at all.

## How to run the smoke test later

When the stack is next online, run this to confirm by hand:

```powershell
cd C:\AI\OCULUSBOUND\Oculus-osint-main
.\launch-oculus0osint.ps1
```

Then in a browser at `http://127.0.0.1:3010`:

1. Sign in (or rely on `WWV_DEV_NO_AUTH=true` if still set during dev)
2. Wait for plugins to load → look for FL511 / GDOT / WSDOT cameras on the map
3. Click an FL511 camera dot — expect the IntelTab to populate with:
   - Header (entity title, source badge)
   - Position, timestamp
   - **Camera stream preview with Play button** (or for image-less FL511-PUBLIC cameras, the camera should no longer appear on the globe at all — Fix B)
   - Face / Go To / Lock action buttons

4. Click 3 different cameras across different sources to verify variety
5. Open DevTools console — should be **clean of `[PluginErrorBoundary]` lines** for the camera plugin. If a different plugin crashes, the new Fix C two-line log format should show both the error and the React component stack.

## Acceptance criteria for closing this gate

- [ ] Three FL511 / camera entities clicked; each one either shows a working feed (Play button + preview image), or — if their upstream was image-less — they are not present on the globe at all.
- [ ] No `[PluginErrorBoundary] Plugin component 'camera' crashed` lines in the console.
- [ ] Skip-count logs from the adapters (e.g. `[fl511-public] skipped N of M upstream rows with no stream URL`) appear in the Next.js server logs on first fetch.

When closed, save:
- `gate-4-working-feed.png` — screenshot of a working FL511 (or other) camera feed in the IntelTab
- `gate-4-console.txt` — DevTools console excerpt confirming no boundary crashes on camera click
