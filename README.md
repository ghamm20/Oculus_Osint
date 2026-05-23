<div align="center">

<!-- Generated: 2026-04-23 06:11:00 UTC -->
# Oculus0Osint

**The Open-Source, Plugin-Driven Geospatial Intelligence Engine**

*A modular situational awareness platform designed to ingest live data streams and render them as interactive, cinematic layers on a high-fidelity CesiumJS 3D globe.*

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![CesiumJS](https://img.shields.io/badge/Cesium-JS-4272D0)](https://cesium.com/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)

</div>

---

Oculus0Osint is a real-time geospatial engine visualizing live global data on an interactive 3D globe. Utilizing a dynamic "All-Bundle" plugin architecture, independent data sources—like live aircraft, maritime vessels, or conflict events—are ingested and rendered decoupled from the core 3D viewer.

## Key Features

- **"All-Bundle" Plugin Architecture**: Ingest any data source dynamically without touching the core platform.
- **High-Fidelity 3D Rendering**: Google Photorealistic 3D Tiles and LOD modeling powered by CesiumJS.
- **Real-Time Data Pipeline**: High-frequency WebSocket updates managed by a custom `DataBus`.
- **Advanced Entity Management**: Automatic horizon culling, chunked primitive rendering, and 3D stacking/spiderification.
- **Marketplace Integration**: Download and sync new plugins directly from the UI.

## Core Technologies

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5
- **3D Engine:** CesiumJS + Resium (Google Photorealistic 3D Tiles)
- **State Management:** Zustand
- **Event Bus:** Custom typed `DataBus` for high-frequency WebSocket updates
- **Database:** PostgreSQL via Prisma 7
- **Deployment:** Docker multi-stage build, Coolify

## Project Architecture

Oculus0Osint separates the data acquisition layer from the frontend rendering loop, using a real-time event bus to bridge them.

```mermaid
flowchart TD
    subgraph Data Sources
    A[Public APIs] -->|Poll| B[Data Engine Seeders]
    C[Microservices] -->|Stream| B
    end

    subgraph Frontend Pipeline
    B -->|WebSocket /stream| D[DataBus & WsClient]
    D -->|Hydrate| E[Zustand Store]
    E -->|Memoized Entities| F[Entity Renderer]
    F -->|Primitives| G[CesiumJS Globe]
    end

    subgraph Plugins
    H[Plugin Registry] -->|Load| I[Dynamic Import CDNs]
    end
    
    H -.-> D
```

## Prerequisites

Before running the application, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker](https://www.docker.com/) (for self-hosting or full local dev)
- PostgreSQL (or rely on the `coolify-db` / local compose container)

## Quick Start (Local Development)

From this working fork:

```powershell
cd D:\OCULUSBOUND\Oculus-osint-main
corepack pnpm install
node scripts/setup.mjs
corepack pnpm dev
```
Visit `http://localhost:3000` to see the live globe.

## Project Structure

The codebase utilizes a `pnpm` monorepo configuration:

```text
Oculus0Osint/
├── src/                  # Core frontend app
│   ├── app/              # Next.js App Router (pages, API routes)
│   ├── components/       # Shared UI, Globe panels, and 3D layouts
│   ├── core/             # DataBus, Polling, PluginManager, Store
│   └── plugins/          # Built-in plugins and registry logic
├── packages/             # Monorepo packages
│   ├── wwv-plugin-sdk/   # SDK interfaces and manifest schemas
│   └── wwv-plugin-*/     # Individual plugins & their backends
└── prisma/               # Database schemas & migrations
```

## Plugin Ecosystem

Oculus0Osint operates on an open-core philosophy. The platform itself is data-agnostic; all data sources are dynamically imported as plugins at runtime.

- **[Plugin Quickstart Guide](docs/plugin-quickstart.md)**: Learn how to scaffold and link your first plugin using the `@worldwideview/cli`.
- **[Advanced Plugin Guide](docs/plugin-advanced.md)**: Deep dive into microservice data seeders, WebSockets, complex 3D rendering, and Marketplace publishing.

## Upstream Compatibility

Oculus0Osint keeps the existing plugin compatibility contracts intact:

- **`@worldwideview/wwv-plugin-sdk`**: Shared SDK import path for plugin code.
- **`WWV_*` environment variables**: Existing runtime and marketplace integration contracts.
- **`wwv-data-engine`**: Existing compatible data backend naming.

## Development & Workflow

- **Branching & Commits:** We strictly enforce [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`). Every commit should utilize our semantic versioning `[/commit]` workflow.
- **Coding Standards:** We emphasize vanilla CSS (no Tailwind), strict TypeScript 5, and file modularity (max 150 lines per file).
- **Testing:** We use Vitest with `jsdom`. All new core logic should be accompanied by tests, running via `pnpm test`.

See [Docs: Development](docs/development.md) and [Docs: Testing](docs/testing.md) for more details.

## Contributing

We welcome community contributions! Please review our coding standards and PR processes before submitting code. For detailed instructions on local development and setting up your environment, see our [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
See [NOTICE.md](NOTICE.md) for the Oculus0Osint fork notice.

## Documentation Index

Explore our comprehensive documentation suite for detailed engineering insights:

- **[Project Overview](docs/project-overview.md)**: High-level value proposition and technology stack.
- **[Architecture](docs/architecture.md)**: DataBus event stream and Zustand state management.
- **[Build System](docs/build-system.md)**: Monorepo structure, Next.js standalone output, and Docker builds.
- **[Development](docs/development.md)**: Coding conventions and common implementation patterns.
- **[Testing](docs/testing.md)**: Vitest setup and coverage targets.
- **[Deployment](docs/deployment.md)**: Coolify integration and persistent volumes.
- **[Files Catalog](docs/files.md)**: Comprehensive mapping of core source files.

> [!IMPORTANT]
> **Fair-Use Notice:** This application may contain copyrighted material the use of which has not always been specifically authorized by the copyright owner. Such material is made available for educational purposes, situational awareness, and to advance understanding of global events under "fair use" (Section 107 of the US Copyright Law).
