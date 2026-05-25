# Oculus0Osint — Roadmap

This fork's roadmap is structured as phases. Each phase ends with a working build, a report, and verification evidence. Phases 1–6 have shipped; Phases 7+ are queued or owner-gated.

The upstream WorldWideView project's roadmap (Stripe / Supabase / cloud auto-provisioning / marketplace publishing flow / etc.) is **out of scope for this fork**. See `OCULUS_PHASE5_REPORT.md` for the rationale.

---

## Shipped

| Phase | Subject | Commit |
| --- | --- | --- |
| 1 | Local edition lockdown + telemetry strip | `286a566` |
| 1.5 | Local Ollama on `C:\AI` + AUTH_TRUST_HOST + docs trim | `e4f4833` |
| 2 | Plugin marketplace mirror (replaces `unpkg.com` at runtime) | `20bcd47` |
| 3 | Sovereign imagery default (NaturalEarthII bundled) | `709ed61` |
| 4 | Local data engine stub (replaces `wss://dataengine.worldwideview.dev`) | `577bfd3` |
| 5 | Stripe + Supabase rip-out | `338c4fa` |
| 6 | `isCloud` cleanup (remove WWV apex-redirect, generalize tenant matcher) | `8eb4f14` |

Result: Gate F is clean on cold authenticated load with plugin layers enabled. Zero requests to non-localhost origins.

## Queued (autonomous-safe)

| Phase | Subject | Risk |
| --- | --- | --- |
| 7 | Docs WWV → Oculus0Osint completion pass | low (prose only) |
| 8 | Test coverage for `local-data-engine.mjs` + `sync-plugin-mirror.mjs` | low (additive) |
| 9 | Per-plugin polling cadence tuning in the engine stub | low |

## Owner-gated

These need an architectural call or a judgment about acceptable upstream dependencies.

| Item | Why gated |
| --- | --- |
| **ARGOS coupling decision** | Sixth interface vs ARGOS map pane. Phase 2/3/4 reports all flag this. Phase 3 added an env-var seam (`NEXT_PUBLIC_DEFAULT_IMAGERY_LAYER`) keeping both paths viable; finalization is owner work. |
| **`civil-unrest` and `cyber-attacks` data sources** | The Phase 4 engine stub returns empty items for these because Oculus has no native endpoint. Wiring real sources (ACLED for civil unrest, CISA for cyber) could re-introduce off-site outbound. Owner decision on acceptable scope. |
| **Higher-resolution offline imagery** | NaturalEarthII at zoom 2 is functional but coarse. Phase 3.5 candidate: bake higher-res Blue Marble or Sentinel-2 composite into `public/`. Owner decision on disk size vs sovereignty trade-off. |
| **`iss` plugin third-party namespace fix** | `@nullptr1945/wwv-plugin-iss` 404s on unpkg; the mirror has the manifest but no bundle. Owner decision: skip the plugin, source it elsewhere, or write a replacement. |
| **Tri-state edition collapse** | Phase 6 kept `cloud` as a valid edition value (functionally identical to `local`). Full removal would touch `core/edition.ts`, `proxy.ts`, the tenant route, and the `PluginManager` type. Mechanical but ARGOS-architectural-adjacent. |

## Upstream compatibility surfaces (preserved)

- `@worldwideview/wwv-plugin-sdk` — plugin SDK package identifier.
- `WWV_*` env contract names — all honored.
- Default URL constants in code — defaults to upstream marketplace / data engine when env vars unset; env overrides redirect to local equivalents.
- Plugin manifest schema, Ed25519-signed registry verification.

Touching any of these is doctrine-prohibited in this fork. See [`CONTRIBUTING.md`](CONTRIBUTING.md).
