# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.3.0-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/graph-tutorial.svg)](https://github.com/watanabe3tipapa/graph-tutorial/issues)

**EBPM. Collect data relentlessly, visualize it.**

graph-tutorial is an "evidence pipeline" for Evidence-Based Policy Making (EBPM).
It collects and updates Japan's total population data (e-Stat) and EBPM-related GitHub
resources with autonomous collectors, and generates line charts and category charts
on demand within a loose-leaf notebook-style landing page.

[日本語](README.md) | [English](README_EN.md)

## Concept

### Why an "evidence pipeline"

EBPM means designing and validating policy with evidence. But in administrative practice,
it has not spread because the **"tools" that connect data and methods are missing**.
The data is public, and the methods exist in papers. This tool bridges that gap with a
codified pipeline of "fetch → shape → plot → publish".

| Practice | graph-tutorial's counterpart |
|---|---|
| Discover and fetch data | `ebpm-repos` / `estat-population` collectors |
| Keep evidence always up to date | node-cron scheduled runs + startup stale detection |
| Keep running on fetch failure | Degradation handling that preserves existing data |
| Survey methods and repositories | EBPM GitHub resources organized into 8 categories |
| Generate charts on demand | 4 chart types: category / stars / language / activity |

> A deeper discussion of why this tool exists is in the "考察 / Consideration" tab of the LP.

### Consideration: what kind of EBPM tools should we build?

1. **Open access to data** — data that cannot be found or fetched does not exist as evidence
2. **Democratize analytical methods** — bring causal inference, etc., to practitioners
3. **Guarantee reproducibility with code** — an open pipeline can be reproduced by anyone
4. **Keep tracking evidence** — automated collection keeps everything up to date
5. **Relentless smoke tests (accuracy absolutism)** — data sources quietly break; correctness must be guarded by tests
6. **The case for self-build** — EBPM tools should be built and used by yourself. Outsourcing to consultants is to be avoided: knowledge never stays in the organization, operations become contract-bound, and everything turns into a black box

## Features

- **Autonomous data collection**: self-contained collectors in `server/collectors/` + node-cron scheduling
- **Startup stale detection**: refreshes data automatically when it is outdated
- **Degradation handling**: keeps existing data on API/network failure
- **Hybrid data sources**: live API (`ESTAT_APP_ID` / `GITHUB_TOKEN`) + static fallback
- **Loose-leaf notebook LP**: handwriting-style ruled lines, binder holes, and 7 divider tabs
- **On-demand charts**: Chart.js charts for category / stars / language / activity
- **WEB-UI (practical console)**: catalog search, sort, CSV/JSON export, detail modal, favorites (localStorage), URL-hash state sharing
- **Data freshness badges**: shows the last update of each dataset and warns when data is old (works on GitHub Pages too)
- **Collector run WEB-UI**: run each collector with one click from the "Data Collection" tab (server only)
- **Accuracy absolutism**: `npm run smoke` data-integrity smoke tests run on every CI run
- **Kitesurf info collection**: GitHub Pages LP + Cloudflare Worker call Kitesurf to fetch Markdown / HTML / screenshots / PDF / links (LLM natural-language instructions supported)
- **Built-in LP tutorials**: usage guides embedded in the Info Collection / Data Collection / Usage tabs
- **Modern SPA**: Vite + React + TypeScript (npm workspaces monorepo)

## Quick Start

### Prerequisites

| Tool | Required version | Check |
|---|---|---|
| Node.js | >= 20 | `node --version` |

### 1. Clone the repository

```bash
git clone https://github.com/watanabe3tipapa/graph-tutorial.git
cd graph-tutorial
```

### 2. Install and run

```bash
npm install
npm run dev        # dev: http://localhost:5173 (proxies API to 3000)
npm run build && npm start   # prod: http://localhost:3000
```

### 3. Collect data

```bash
npm run collect            # run all collectors
npm run collect:list       # list registered collectors
npm run collect:repos      # EBPM repositories only
npm run collect:population # population data only
npm run collect:kitesurf   # Kitesurf snapshot only
```

Enable API/live integrations via environment variables (see `.env.example`):

```bash
export ESTAT_APP_ID=...     # e-Stat statistics API (latest population data)
export GITHUB_TOKEN=...     # GitHub API (latest stars / updated date)
export CF_ACCOUNT_ID=...    # Cloudflare (Kitesurf snapshot collection)
export CF_TOKEN=...         # Cloudflare API token (permission: Browser Rendering - Edit)
```

## Environment Variables

| Variable | Description |
|---|---|
| `ESTAT_APP_ID` | e-Stat statistics API application ID |
| `GITHUB_TOKEN` | GitHub API token |
| `CF_ACCOUNT_ID` | Cloudflare account ID (Kitesurf collector; skipped when unset) |
| `CF_TOKEN` | Cloudflare API token (permission: Browser Rendering - Edit) |
| `COLLECTOR_DISABLED` | Set to `1` to disable auto-collection and the scheduler |

## Client Build-time Variables

| Variable | Description |
|---|---|
| `VITE_KITESURF_WORKER_URL` | Cloudflare Worker URL (used by the "Info Collection" tab to call Kitesurf; degraded display when unset). Set it as the GitHub Actions secret `VITE_KITESURF_WORKER_URL` |

## Architecture

```
graph-tutorial/
├── server/                 # Express 5 JSON API
│   ├── collectors/         # autonomous collectors (1 folder = 1 data source)
│   │   ├── ebpm-repos/         # EBPM-related GitHub resource list
│   │   ├── estat-population/   # e-Stat population estimates
│   │   └── kitesurf-snapshot/  # Cloudflare Kitesurf README collection (when CF_* set)
│   ├── lib/
│   │   ├── collector-registry.js   # discovery + run + cron + stale detection
│   │   ├── estat.js                # e-Stat fetch + snapshot/fallback
│   │   ├── github.js               # GitHub API fetch + fallback
│   │   └── kitesurf.js             # Kitesurf REST API wrapper (/markdown)
│   ├── data/                # collector output (with collectedAt)
│   └── scripts/run-collectors.js   # CLI
├── worker/                 # Cloudflare Workers (info collection server)
│   ├── wrangler.toml       # browser / ai / kv bindings + cron
│   └── src/index.ts        # POST /collect (LLM instructions) + GET /snapshot + CORS
└── client/                 # Vite + React + TypeScript SPA
    └── src/
        ├── App.tsx                 # loose-leaf tab navigation (URL-hash sync)
        ├── hash.ts                 # URL sync of tab / filter state
        ├── download.ts             # CSV / JSON export (tested)
        ├── repoStats.ts            # chart aggregation (pure functions, tested)
        ├── kitesurf.ts             # Worker client (VITE_KITESURF_WORKER_URL)
        └── components/             # tab implementations
            ├── Consideration.tsx     # Consideration
            ├── Framework.tsx         # Data Collection (collector run WEB-UI + internals)
            ├── PopulationView.tsx    # population chart (+ PopulationChart.tsx)
            ├── ReposView.tsx         # EBPM repositories (+ ReposChart.tsx)
            ├── Catalog.tsx           # catalog (search, sort, export, favorites)
            ├── RepoModal.tsx         # repository detail modal
            ├── FreshnessBadge.tsx    # data freshness badge
            ├── CollectorControls.tsx # collector run WEB-UI
            ├── KitesurfConsole.tsx   # info collection (simple / LLM natural language)
            └── Usage.tsx             # usage (LP tab guide + developer guide)
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/population` | Japan total population (labels / data / source / unit / isLive / collectedAt) |
| `GET /api/repos` | EBPM repository catalog (categories / repos / isLive / sourceUrl / collectedAt) |
| `GET /api/collectors` | Registered collectors (id / name / cron / collectedAt / stale) |
| `POST /api/collect/:id` | Run a collector (returns ok / skipped / error as JSON) |

### Cloudflare Worker endpoints

| Endpoint | Description |
|---|---|
| `POST /collect` | Kitesurf info collection (body: `{ url, action }` or `{ instruction }`) |
| `GET /snapshot` | Latest snapshot stored by Cron + KV |
| `GET /health` | Health check for Worker / Kitesurf / AI / KV |

## Data Sources

- **EBPM repository catalog**: [EBPM-related GitHub resources](https://pelican-white-paper.pages.dev/ebpm-github-resources) (8 categories / 38 repositories)
- **Population data**: Government Statistics Portal (e-Stat) / Statistics Bureau of Japan, "Population Estimates"
- **graph-tutorial snapshot**: the README collected by Cloudflare Kitesurf (Browser Run `/markdown`)

## Cloudflare Kitesurf Integration

graph-tutorial uses a **GitHub Pages (LP / client) + Cloudflare Workers (info collection server)**
setup to leverage Kitesurf (Browser Run's lightweight, agent-friendly browser).

- **LP "Info Collection" tab**: specify URL + action (Markdown / HTML / screenshot / PDF / links),
  or give an **LLM natural-language instruction** (Workers AI parses it into `{url, action}`)
- **Worker**: `POST /collect` (CORS-aware / input validation), Cron + KV periodic snapshots (`GET /snapshot`)
- **Server-side collector**: `server/collectors/kitesurf-snapshot` (enabled via `.env` `CF_ACCOUNT_ID` / `CF_TOKEN`)

## Documentation

- [DEV-MEMO](DEV-MEMO.md) — development notes

## Tests

```sh
npm test        # Vitest (18 tests)
npm run lint    # ESLint
npm run build   # typecheck + Vite build
npm run smoke   # data-integrity smoke test
```

## License

This repository does not currently specify a license.

## Contact

GitHub: [https://github.com/watanabe3tipapa/graph-tutorial](https://github.com/watanabe3tipapa/graph-tutorial)