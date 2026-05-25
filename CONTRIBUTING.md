# Contributing to Oculus0Osint

This fork of Oculus0Osint is operated as a sovereign local edition by its owner. The upstream WorldWideView plugin SDK is preserved as a compatibility surface, but the upstream cloud / marketplace / billing paths are out of scope for this fork.

Contributions are welcomed against the local-edition surface. If a change targets the upstream cloud edition or reintroduces an off-site dependency, expect pushback during review.

---

## Getting Started

1. **Fork** this repository on GitHub.
2. **Clone** your fork:
   ```powershell
   git clone https://github.com/<your-username>/Oculus_Osint.git
   cd Oculus_Osint
   ```
3. **Install dependencies**:
   ```powershell
   corepack pnpm install
   ```
4. **Bring up Postgres**:
   ```powershell
   docker compose up -d db
   ```
5. **Initialize the schema**:
   ```powershell
   corepack pnpm exec prisma generate
   corepack pnpm exec prisma db push --accept-data-loss
   ```
6. **Build + launch**:
   ```powershell
   corepack pnpm build
   .\launch-oculus0osint.ps1
   ```

Visit `http://localhost:3010`. First run takes you to `/setup` to create the owner account; subsequent runs hit `/login`.

---

## Doctrine (applies to all PRs)

- **Do not** modify `@worldwideview/*` package identifiers, `WWV_*` env contract names, or the marketplace/registry/data-engine default URL constants. Those are compatibility contracts.
- **Do not** reintroduce off-site outbound calls on cold load. Run Gate F (`node scripts/phase1-gate-f.mjs`) before claiming a PR is ready. Must show `0 off-site requests`.
- **Do not** introduce new dependencies without a phase plan documenting why.
- **Do not** make architectural calls (ARGOS coupling, cloud-mode reintroduction) without an explicit phase plan.

---

## Development Setup

| Requirement | Version |
|-------------|---------|
| Node.js     | 18+     |
| pnpm        | 11+ (via corepack) |
| Docker Desktop | recent |
| PostgreSQL  | brought up via `docker compose up -d db` |
| Ollama      | optional (Oculus Analyst panel) |

See [`docs/development.md`](docs/development.md) and [`docs/build-system.md`](docs/build-system.md) for deeper detail.

---

## Project Structure

```
src/
  app/          Next.js App Router (pages + /api routes)
  components/   UI panels, globe overlays, video
  core/         DataBus, Zustand store, PluginManager, globe rendering
  lib/          Auth, marketplace helpers, rate limiters
  plugins/      Built-in plugin code
packages/
  wwv-plugin-sdk/  Upstream SDK (compatibility surface)
public/
  wwv-mirror/      Phase 2 plugin mirror (registry + manifests + bundles)
scripts/         Setup, launch, gate-verification, mirror-sync, data-engine stub
prisma/          Postgres schema
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the render pipeline and plugin lifecycle.

---

## How to Contribute

Welcomed:

- 🐛 **Bug fixes** — open an issue or PR. Include reproduction steps.
- ⚡ **Performance** — Cesium primitive optimization, polling cadence tuning, etc.
- 🧪 **Tests** — Vitest coverage. Especially for `scripts/local-data-engine.mjs` and `scripts/sync-plugin-mirror.mjs`.
- 📖 **Docs** — improvements, examples, screenshots.
- 🔌 **Plugins** — new data-layer plugins that ship as part of `public/wwv-mirror/` (sovereign) rather than upstream-fetched.

Out of scope for this fork:

- Upstream cloud-mode auth (Supabase, Stripe billing) — removed in Phase 5.
- Marketplace publishing flow — this fork is a consumer of the mirror, not a publisher.

For non-trivial features, **open an issue first** to discuss the design.

---

## Code Standards

- **Single Responsibility** — each file/module does one thing.
- **DRY & SOLID** — favor composition.
- **Clean Architecture** — separate UI, logic, data.
- **Defensive Programming** — validate inputs, handle edge cases explicitly.
- **File size** — keep files under ~150 lines; split into modules as they grow.
- **TypeScript strict** — avoid `any`.

---

## Commit & Branch Conventions

**Branch naming:**
```
feat/short-description
fix/short-description
docs/short-description
refactor/short-description
```

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/). Phase commits use the `phase N: <subject>` prefix per the existing pattern.

---

## Pull Request Process

1. Ensure your branch is rebased on `origin/main`.
2. Run tests: `corepack pnpm test`.
3. Run Gate F: `node scripts/phase1-gate-f.mjs http://localhost:3010/ /tmp/gate-f.txt /tmp/cookies.txt` (requires running app + auth cookie).
4. Fill out the PR template.
5. Request a review — PRs need at least one approval before merging.

---

## Running Tests

```powershell
corepack pnpm test          # Vitest run
```

Tests live alongside source files as `.test.ts` files.
