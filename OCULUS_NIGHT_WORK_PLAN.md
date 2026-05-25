# Oculus0Osint — Overnight Autonomous Work Plan

**Started:** 2026-05-25 (owner went to bed)
**Budget:** ~4 hours wall-clock from start of loop.
**Posture:** continue the sovereign-stack phase work. Mechanical / low-risk only. Defer anything that needs an architectural call.

---

## Doctrine (must hold across all autonomous work)

- Each phase ends with a working build, committed.
- Push to `main` is pre-authorized for this session (owner pushed Phases 4 + 5 explicitly).
- **Do not** modify `@worldwideview/*` package names, `WWV_*` env contract names, or marketplace URL constants.
- **Do not** make architectural calls (ARGOS coupling, etc.).
- **Do not** introduce new dependencies.
- **Do not** re-introduce off-site outbound calls. Gate F must stay clean.
- Honest failures. Skip + log if a phase becomes risky/unclear; do not paper over.

## Stop conditions

- 4 hours of cumulative wall-clock elapsed.
- Plan exhausted (all phases below in `done` state).
- Build failure I can't resolve in ~30 minutes.
- Gate F regresses (any off-site request appears).
- Any phase requires an architectural / subjective decision from the owner.

## Loop protocol

Each loop iteration:
1. Read this file. Find the first phase in `pending` or `in_progress` status.
2. If none → exit loop with a final summary commit.
3. If found → execute that phase (inventory → plan → execute → verify → commit → push → update this file marking it `done` with commit SHA).
4. Schedule next wake-up.

When marking a phase done, append a one-line note with the commit SHA and any honest issue encountered.

---

## Phase backlog

### Phase 6 — `isCloud` + tri-state edition cleanup
**Status:** done
**Estimated:** 60–75 minutes
**Risk:** low, mechanical
**Scope:**
- Inventory every reference to `isCloud`, `cloud` edition gate, and tenant-subdomain logic.
- Decide: remove `cloud` as a valid `NEXT_PUBLIC_WWV_EDITION` value OR keep it but make it behave identically to `local`. Lean toward the latter (smaller surface change).
- If keeping the value: remove `isCloud`-gated code paths that no longer have distinct behavior (the workspace tenant resolver, the proxy apex redirect, the deleted Stripe/Supabase paths already gone).
- Update `src/core/edition.ts` comments to reflect that cloud and local are now functionally identical in this fork.
- Verify: build passes, owner login still works, Gate F still 0 off-site with layers ON.
- Gates: 6A inventory, 6B no isCloud branches remain (or are doctrine-noted), 6C build passes, 6D Gate F clean.
- Deliverables: `OCULUS_PHASE6_PLAN.md`, `OCULUS_PHASE6_REPORT.md`, `_phase6_verification/`.

### Phase 7 — Docs WWV → Oculus0Osint completion pass
**Status:** pending
**Estimated:** 45–60 minutes
**Risk:** low, prose-only
**Scope:**
- Walk through `docs/*.md`. For each: drop upstream-WWV ecosystem prose, keep SDK contract refs, re-brand to Oculus0Osint local-edition voice.
- Rewrite `README.md` to reflect the Phase 1–5 operational shape (local Postgres, local Ollama, local plugin mirror, sovereign imagery, local data engine, no Stripe/Supabase).
- Spot-check `CONTRIBUTING.md`, `NOTICE.md`, `ROADMAP.md` for stale upstream language.
- Verify: links resolve, no dead refs.
- Gates: 7A docs grep clean of user-facing WWV strings, 7B README accurately describes current state, 7C no broken internal links.
- Deliverables: `OCULUS_PHASE7_PLAN.md`, `OCULUS_PHASE7_REPORT.md`, `_phase7_verification/`.

### Phase 8 — Test coverage for new sovereign infrastructure
**Status:** pending
**Estimated:** 60–90 minutes
**Risk:** low, additive (no behavior changes)
**Scope:**
- Add Vitest tests for `scripts/local-data-engine.mjs` — exercise `/manifest`, `/api/{id}` translation per known plugin shape, WS welcome/subscribe protocol.
- Add Vitest tests for `scripts/sync-plugin-mirror.mjs` — exercise manifest rewriting (entry URL local-substitution, npmPackage stripping). Mock the upstream fetch.
- Verify: `pnpm test` passes.
- Gates: 8A new test files run, 8B no regressions in existing tests.
- Deliverables: `OCULUS_PHASE8_PLAN.md`, `OCULUS_PHASE8_REPORT.md`, `_phase8_verification/`.

### Phase 9 — Per-plugin polling cadence tuning (engine stub)
**Status:** pending
**Estimated:** 30–45 minutes
**Risk:** low
**Scope:**
- Phase 4 stub polls every 30s for all plugins. Aviation needs faster (~10s) since aircraft move; conflict-zones / satellites are slow-changing (~5min OK).
- Add a `POLL_INTERVAL_MS` per-plugin map in `scripts/local-data-engine.mjs`. Default 30s; aviation+maritime 10s; satellite+conflict-zones 300s.
- Document in the stub header.
- Verify: stub restarts cleanly, observes per-plugin timing in log.
- Gates: 9A stub starts, 9B polling intervals respected.
- Deliverables: `OCULUS_PHASE9_PLAN.md`, `OCULUS_PHASE9_REPORT.md`, `_phase9_verification/`.

### Phase 10 — Out of autonomous scope (DO NOT EXECUTE WHILE OWNER IS ASLEEP)
**Status:** owner-gated
**Reason:** requires architectural call
- ARGOS coupling decision (sixth interface vs map pane).
- `civil-unrest` and `cyber-attacks` data sources (could re-introduce off-site outbound).
- Higher-resolution offline imagery (large downloads, owner judgment on imagery quality vs disk).
- `iss` plugin third-party namespace fix.

These are tracked here so the loop sees them as deliberately deferred, not forgotten.

---

## Execution log

(Each loop iteration appends a line here.)

- 2026-05-25 — Plan created.
- 2026-05-25 — Phase 6 complete. Apex-redirect to `worldwideview.dev/hub` removed; tenant subdomain matcher generalized away from `.app.worldwideview.dev`; `isCloud` constant retained with doc-comment for future ARGOS coupling. Gate F still clean (0/83 off-site). Commit pending push.
