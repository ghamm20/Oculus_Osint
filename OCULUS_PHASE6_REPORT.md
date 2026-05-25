# Oculus0Osint — Phase 6 Report

**Phase:** `isCloud` / Tri-State Edition Cleanup
**Captured:** 2026-05-25 (autonomous overnight loop)
**Predecessor:** Phase 5 (commits `338c4fa` + `fd1e046`)
**Stance:** running under the night-work loop; will push on completion.

---

## 1. Scope Recap

From `OCULUS_NIGHT_WORK_PLAN.md` Phase 6:
- **Decision:** keep `cloud` as a valid `NEXT_PUBLIC_WWV_EDITION` value, but make it behave identically to `local` (smaller surface change than deleting the tri-state entirely).
- Remove the only user-visible cloud-specific behavior left after Phase 5: the hardcoded apex-redirect to `https://worldwideview.dev/hub`.
- Replace the WWV-hardcoded subdomain match in `proxy.ts` (`.app.worldwideview.dev`) with a generic pattern (`.app.<anything>`) so the tenant hook stays available without referencing upstream branding.
- Document in `edition.ts` that cloud and local are now functionally identical and the `isCloud` constant is retained for the future ARGOS coupling.

## 2. What Changed

### Modified
- `src/proxy.ts`:
  - Removed the hardcoded `https://worldwideview.dev/hub` apex-redirect block (was the only user-visible WWV reference still firing at runtime).
  - Replaced `hostname.includes(".app.worldwideview.dev")` with the generic `hostname.includes(".app.")` so subdomain extraction works for any apex deploy without referencing WWV.
  - Added in-code comments describing the tenant-hook's current dormant state and its future ARGOS coupling role.
- `src/core/edition.ts`:
  - Added a long-form doc comment on `isCloud` explaining that post-Phase-5 cloud = local, and the constant is retained for the pending ARGOS coupling decision.

### Untouched
- `src/app/api/internal/workspace/[subdomain]/route.ts` — already returns a sensible `{status:"active", plan:"basic"}` when `!isCloud`. Harmless to keep.
- `src/core/plugins/PluginManager.ts:70` — type annotation union `"local" | "cloud" | "demo"` stays as-is (matches edition.ts).
- All `@worldwideview/*` package names, `WWV_*` env contract names, marketplace URL constants.

## 3. Gates

Evidence in `_phase6_verification/`.

### Gate 6A — Inventory — **PASS**
`isCloud` / `isCloudDeploy` / `edition === "cloud"` references mapped:
- `src/proxy.ts` (3 usages — tenant extraction + tenant validation + apex redirect)
- `src/core/edition.ts` (constant definition)
- `src/core/plugins/PluginManager.ts` (type annotation)
- `src/app/api/internal/workspace/[subdomain]/route.ts` (cloud gate)

### Gate 6B — No upstream-WWV cloud branding in runtime code — **PASS**
- Hardcoded `worldwideview.dev/hub` redirect: removed.
- Hardcoded `.app.worldwideview.dev` host match: replaced with generic `.app.` matcher.

### Gate 6C — Build passes — **PASS**
`corepack pnpm build` produces a fresh `.next/standalone/server.js`. No warnings introduced.

### Gate 6D — Gate F still clean (layers ON) — **PASS** ✅

```
# total requests observed: 83
# requests to localhost / 127.0.0.1 / data: / blob: : 83
# off-site requests: 0
PASS: no requests to non-localhost origins.
```

Evidence: `_phase6_verification/gate-f-post-cloud-cleanup.txt`.

---

## 4. Honest Issues

1. **Tri-state edition kept, not removed.** The smaller-surface choice. If owner later wants to fully collapse to local-only, that's a follow-up phase touching `edition.ts`, `proxy.ts`, the tenant route, the PluginManager type, and any code branching on `isCloud`. Marked deferred.
2. **Subdomain matcher widened.** The `.app.` pattern now matches any apex domain, not just WWV. This is more correct for a sovereign fork but means cloud-mode deploys would need to pick an apex hostname pattern that doesn't accidentally match user domains. Not relevant in local edition.
3. **`isCloud` is mostly inert** in the local-edition runtime — it gates tenant extraction (which never finds a subdomain on `localhost:3010`) and the tenant validation block. Both are dead-code-on-local-edition by design.

## 5. Files Changed

| File | Change |
| --- | --- |
| `src/proxy.ts` | -8 / +18 (apex redirect removed; tenant matcher generalized; doc comments) |
| `src/core/edition.ts` | -1 / +11 (long-form doc comment on `isCloud`) |
| `_phase6_verification/gate-f-post-cloud-cleanup.txt` | new |
| `OCULUS_PHASE6_REPORT.md` | this file |
| `OCULUS_NIGHT_WORK_PLAN.md` | execution-log + phase status updated to `done` |

No SDK / package name / env contract / URL constant defaults changed.

---

## 6. Recommended Next

Phase 7 (docs WWV → Oculus0Osint completion pass) is next in the autonomous queue.

## 7. Commit

(SHA stamped after commit)
