# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.2.0-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
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

## Features

- **Autonomous data collection**: self-contained collectors in `server/collectors/` + node-cron scheduling
- **Startup stale detection**: refreshes data automatically when it is outdated
- **Degradation handling**: keeps existing data on API/network failure
- **Hybrid data sources**: live API (`ESTAT_APP_ID` / `GITHUB_TOKEN`) + static fallback
- **Loose-leaf notebook LP**: handwriting-style ruled lines, binder holes, and 5 divider tabs
- **On-demand charts**: Chart.js charts for category / stars / language / activity
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
```

Enable API/live integrations via environment variables (see `.env.example`):

```bash
export ESTAT_APP_ID=...     # e-Stat statistics API (latest population data)
export GITHUB_TOKEN=...     # GitHub API (latest stars / updated date)
```

## Environment Variables

| Variable | Description |
|---|---|
| `ESTAT_APP_ID` | e-Stat statistics API application ID |
| `GITHUB_TOKEN` | GitHub API token |
| `COLLECTOR_DISABLED` | Set to `1` to disable auto-collection and the scheduler |

## Architecture

```
graph-tutorial/
├── server/                 # Express 5 JSON API
│   ├── collectors/         # autonomous collectors (1 folder = 1 data source)
│   │   ├── ebpm-repos/         # EBPM-related GitHub resource list
│   │   └── estat-population/   # e-Stat population estimates
│   ├── lib/
│   │   ├── collector-registry.js   # discovery + run + cron + stale detection
│   │   ├── estat.js                # e-Stat fetch + snapshot/fallback
│   │   └── github.js               # GitHub API fetch + fallback
│   ├── data/                # collector output (with collectedAt)
│   └── scripts/run-collectors.js   # CLI
└── client/                 # Vite + React + TypeScript SPA
    └── src/
        ├── App.tsx                 # loose-leaf tab navigation
        ├── repoStats.ts            # chart aggregation (pure functions, tested)
        └── components/             # Consideration / Framework / Population / EBPM / Usage
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/population` | Japan total population (labels / data / source / unit / isLive) |
| `GET /api/repos` | EBPM repository catalog (categories / repos / isLive / sourceUrl) |

## Data Sources

- **EBPM repository catalog**: [EBPM-related GitHub resources](https://pelican-white-paper.pages.dev/ebpm-github-resources) (8 categories / 38 repositories)
- **Population data**: Government Statistics Portal (e-Stat) / Statistics Bureau of Japan, "Population Estimates"

## Documentation

- [DEV-MEMO](DEV-MEMO.md) — development notes

## Tests

```sh
npm test        # Vitest (7 tests)
npm run lint    # ESLint
npm run build   # typecheck + Vite build
```

## License

This repository does not currently specify a license.

## Contact

GitHub: [https://github.com/watanabe3tipapa/graph-tutorial](https://github.com/watanabe3tipapa/graph-tutorial)