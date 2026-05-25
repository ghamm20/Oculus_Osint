<div align="center">

# Oculus0Osint

**Sovereign, plugin-driven, real-time geospatial intelligence on a 3D globe.**

*Self-hosted local edition. No telemetry, no cloud auth, no marketplace round-trips at runtime.*

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![CesiumJS](https://img.shields.io/badge/Cesium-JS-4272D0)](https://cesium.com/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

Oculus0Osint is a real-time geospatial intelligence platform that renders live data streams onto an interactive 3D globe. This fork is operated as a sovereign **local edition** — designed to run end-to-end on a single workstation with zero off-site network dependencies on cold boot.

The upstream WorldWideView SDK (`@worldwideview/wwv-plugin-sdk`, `WWV_*` env contracts, the plugin manifest schema) is preserved as a compatibility surface. The upstream marketplace, cloud auth, billing, and data engine paths have been replaced with same-origin local equivalents.

## Operational shape

| Surface | This fork's local edition | Original upstream |
| --- | --- | --- |
| Auth | NextAuth credentials → Postgres `users` table | Supabase + Stripe (removed Phase 5) |
| Plugin marketplace | Static mirror at `public/wwv-mirror/` | `marketplace.worldwideview.dev` |
| Plugin bundles | Same-origin from `/wwv-mirror/plugins/...` | `unpkg.com/@worldwideview/*` |
| Plugin data engine | Local stub on `:5000`, translates Oculus's `/api/*` | `wss://dataengine.worldwideview.dev` |
| Imagery | Cesium bundled Natural Earth II (zero network) | Google 3D + Bing Maps + Cesium Ion |
| LLM (Oculus Analyst) | Local Ollama on `:11434` from `C:\AI\OCULUSBOUND\ollama-models` | n/a (this fork addition) |
| Telemetry | None (Sentry, Vercel Analytics removed Phase 1) | Sentry + Vercel Analytics |

On a clean authenticated page load with plugin layers enabled, **zero requests go to non-localhost origins**. See `OCULUS_PHASE3_REPORT.md` and `OCULUS_PHASE4_REPORT.md` for the audited evidence.

## Quick start

This fork ships a one-click PowerShell launcher that brings up the full stack.

```powershell
cd C:\AI\OCULUSBOUND\Oculus-osint-main
.\launch-oculus0osint.ps1
```

The launcher:

1. Starts a local Ollama daemon on `127.0.0.1:11434` against `C:\AI\OCULUSBOUND\ollama-models` (if not already running).
2. Starts the local plugin data engine stub on `127.0.0.1:5000` (`node scripts/local-data-engine.mjs`).
3. Launches the Oculus0Osint Next.js server on `0.0.0.0:3010` with `NEXT_PUBLIC_WWV_EDITION=local`, `AUTH_TRUST_HOST=true`, marketplace + registry pointed at the local mirror, and data engine pointed at the local stub.
4. Opens `http://localhost:3010` in your browser.

Prerequisites:

- Node.js 18+
- pnpm (managed by `corepack`)
- Docker Desktop (Postgres is brought up via `docker compose up -d db`)
- Ollama installed at `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` (optional — the Oculus Analyst panel reports offline cleanly if absent)
- At least one model in `C:\AI\OCULUSBOUND\ollama-models` (Phase 1.5 ships with `gemma2-2b-local:latest`)

Manual setup (one-time):

```powershell
cd C:\AI\OCULUSBOUND\Oculus-osint-main
corepack pnpm install
docker compose up -d db
corepack pnpm exec prisma generate
corepack pnpm exec prisma db push --accept-data-loss
corepack pnpm build
# First-run owner account creation:
node scripts/phase1-create-owner.mjs
```

## Project layout

```
Oculus-osint-main/
├── src/
│   ├── app/                  Next.js App Router (pages + /api routes)
│   ├── components/           UI panels, globe overlays, video
│   ├── core/                 DataBus, Zustand store, PluginManager,
│   │                         globe rendering, edition gates
│   ├── lib/                  Auth, marketplace helpers, rate limiters
│   └── plugins/              Built-in plugin code
├── packages/                 Internal monorepo packages
│   └── wwv-plugin-sdk/       Upstream SDK (kept as compatibility surface)
├── public/
│   ├── cesium/               CesiumJS static assets (workers + textures)
│   └── wwv-mirror/           Phase 2 plugin mirror (registry + manifests +
│                             bundles, populated by sync-plugin-mirror.mjs)
├── prisma/                   Postgres schema + migrations
├── scripts/
│   ├── local-data-engine.mjs Phase 4 WS + REST stub on :5000
│   ├── sync-plugin-mirror.mjs Phase 2 one-time mirror sync (touches upstream)
│   ├── phase1-shoot.mjs       CDP screenshotter
│   ├── phase1-gate-f.mjs      Outbound-network audit
│   └── start-standalone.mjs   Loads .env files for `next start`
├── launch-oculus0osint.ps1   Desktop launcher (Ollama + engine + app)
└── OCULUS_PHASE*_REPORT.md   Per-phase delivery reports
```

## Phase history

This fork was rebuilt in phases. Each phase has a plan + report + verification evidence in the repo root.

| Phase | Subject | Report |
| --- | --- | --- |
| 1 | Local edition lockdown + telemetry strip | [OCULUS_PHASE1_REPORT.md](OCULUS_PHASE1_REPORT.md) |
| 1.5 | Local Ollama on `C:\AI` + AUTH_TRUST_HOST + docs trim | (commit `e4f4833`) |
| 2 | Plugin marketplace mirror | [OCULUS_PHASE2_REPORT.md](OCULUS_PHASE2_REPORT.md) |
| 3 | Sovereign imagery default | [OCULUS_PHASE3_REPORT.md](OCULUS_PHASE3_REPORT.md) |
| 4 | Local plugin data engine stub | [OCULUS_PHASE4_REPORT.md](OCULUS_PHASE4_REPORT.md) |
| 5 | Stripe + Supabase rip-out | [OCULUS_PHASE5_REPORT.md](OCULUS_PHASE5_REPORT.md) |
| 6 | `isCloud` cleanup | [OCULUS_PHASE6_REPORT.md](OCULUS_PHASE6_REPORT.md) |

## Documentation

- **[Project Overview](docs/project-overview.md)** — what this fork is and isn't.
- **[Architecture](docs/ARCHITECTURE.md)** — DataBus, plugin lifecycle, render pipeline.
- **[Build System](docs/build-system.md)** — pnpm workspace, Next.js standalone, Cesium asset pipeline.
- **[Development](docs/development.md)** — coding conventions, Zustand slice patterns.
- **[Deployment](docs/deployment.md)** — Docker / Coolify notes (cloud edition; local uses the PowerShell launcher).
- **[Testing](docs/testing.md)** — Vitest setup.
- **[Files Catalog](docs/files.md)** — annotated map of where things live.

## Upstream compatibility

The Oculus0Osint local edition deliberately preserves these surfaces:

- `@worldwideview/*` package identifiers — kept as compatibility contracts.
- `WWV_*` environment variable names — `WWV_BRIDGE_TOKEN`, `WWV_REGISTRY_URL`, `WWV_SKIP_DEFAULT_PLUGINS`, `WWV_DEMO_ADMIN_SECRET`, `WWV_SKIP_LOCAL_DB` — all still honored.
- Default marketplace + registry URL constants in code (`https://marketplace.worldwideview.dev`, `wss://dataengine.worldwideview.dev/stream`). The env overrides redirect runtime to local equivalents; defaults remain valid for any operator who wants the upstream cloud path.

## License

MIT — see [LICENSE](LICENSE). See [NOTICE.md](NOTICE.md) for the Oculus0Osint fork notice.

> [!IMPORTANT]
> **Fair-Use Notice:** This application may visualize copyrighted material whose use has not always been specifically authorized by the copyright owner. Such material is made available for educational, situational-awareness, and global-events-understanding purposes under "fair use" (Section 107 of the US Copyright Law).
