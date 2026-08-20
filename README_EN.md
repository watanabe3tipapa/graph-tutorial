# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.4.0-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
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

> A deeper discussion of why this tool exists is in the "Data Quality & Architecture" tab of the LP.

### Consideration: what kind of EBPM tools should we build?

1. **Open access to data** — data that cannot be found or fetched does not exist as evidence
2. **Democratize analytical methods** — bring causal inference, etc., to practitioners
3. **Guarantee reproducibility with code** — an open pipeline can be reproduced by anyone
4. **Keep tracking evidence** — automated collection keeps everything up to date
5. **Relentless smoke tests (accuracy absolutism)** — data sources quietly break; correctness must be guarded by tests
6. **The case for keeping in-house capabilities** — EBPM tools should keep data and analysis procedures inside the organization so they can be verified and continuously updated. External resources are fine, but reproducible, verifiable procedures should stay in-house

## Features

- **Autonomous data collection**: self-contained collectors in `server/collectors/` + node-cron scheduling
- **Startup stale detection**: refreshes data automatically when it is outdated
- **Degradation handling**: keeps existing data on API/network failure
- **Hybrid data sources**: live API (`ESTAT_APP_ID` / `GITHUB_TOKEN`) + static fallback
- **Loose-leaf notebook LP**: handwriting-style ruled lines, binder holes, and 5 divider tabs (Home / Demo / EBPM Catalog / Install / Data Quality)
- **Clear demo-vs-local separation**: capability badges (try here / run locally / admin-only) and a data-status strip make it obvious where each feature works
- **On-demand charts**: Chart.js charts for category / stars / language / activity
- **WEB-UI (practical console)**: catalog search, sort, CSV/JSON export, detail modal, favorites (localStorage), URL-hash state sharing
- **Data freshness badges**: shows the last update of each dataset and warns when data is old (works on GitHub Pages too)
- **Collector run WEB-UI**: run each collector with one click from the "Install" tab (Step 3; server only)
- **Accuracy absolutism**: `npm run smoke` data-integrity smoke tests run on every CI run
- **Arbitrary-URL collection is suspended**: until auth, rate limits, and destination controls are in place, the public LP exposes no arbitrary-URL input or run UI (the Worker is limited to server-side collector use)
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
| `COLLECTOR_ADMIN_TOKEN` | Remote auth token for the admin API (`/api/collectors` / `/api/collect/:id` / `/api/audit`). When unset, the admin API is loopback-only (fail closed) |
| `TRUST_PROXY` | Set to `1` to trust `X-Forwarded-For` (for IP checks behind a reverse proxy) |
| `FAILURE_WEBHOOK_URL` | Webhook URL for collection-failure notifications (Slack / Teams, etc.). No notification when unset |
| `FAILURE_NOTIFY_INTERVAL_MINUTES` | Failure-notification cooldown per collector (minutes, default 360) |

## Client Build-time Variables

| Variable | Description |
|---|---|
| `VITE_KITESURF_WORKER_URL` | Cloudflare Worker URL (for server-side collector use; the public LP's info-collection UI is suspended until security controls are in place) |

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
        ├── App.tsx                 # loose-leaf tab navigation (ARIA Tabs + URL-hash sync)
        ├── hash.ts                 # URL sync of tab / filter state
        ├── download.ts             # CSV / JSON export (tested)
        ├── repoStats.ts            # chart aggregation (pure functions, tested)
        └── components/             # tab implementations
            ├── Home.tsx              # Home (hero + 3 CTAs + data-status strip + demo/local comparison)
            ├── CapabilityBadge.tsx   # capability badge (demo / local / admin / suspended)
            ├── DataStatusStrip.tsx   # data-status strip (acquisition date, counts, freshness)
            ├── PopulationView.tsx    # population demo (+ PopulationChart.tsx)
            ├── Catalog.tsx           # EBPM catalog (explore / overview segments)
            ├── RepoModal.tsx         # repository detail modal
            ├── FreshnessBadge.tsx    # data freshness badge
            ├── CollectorControls.tsx # collector run WEB-UI
            ├── Usage.tsx             # Install (3 steps)
            └── Quality.tsx           # Data Quality & Architecture (sources, freshness, design philosophy)
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/population` | Japan total population (labels / data / source / unit / isLive / collectedAt) |
| `GET /api/repos` | EBPM repository catalog (categories / repos / isLive / sourceUrl / collectedAt) |
| `GET /api/collectors` | Registered collectors (id / name / cron / collectedAt / stale) |
| `POST /api/collect/:id` | Run a collector (returns ok / skipped / error as JSON) |
| `GET /api/audit` | Audit log (recent run history, protected like the admin API) |

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

graph-tutorial's backend uses a **GitHub Pages (LP / client) + Cloudflare Workers (info collection server)**
setup to leverage Kitesurf (Browser Run's lightweight, agent-friendly browser).

> **Suspended for public use**: arbitrary-URL info collection (Kitesurf) exposes no UI on the public LP
> until auth, rate limits, and destination controls are in place. The Worker is limited to the
> server-side collector (`server/collectors/kitesurf-snapshot`) and does not accept arbitrary URL runs
> from the public.

- **Worker**: `POST /collect` (auth required, destination allowlist, per-IP rate limit), Cron + KV periodic snapshots (`GET /snapshot`)
- **Server-side collector**: `server/collectors/kitesurf-snapshot` (enabled via `.env` `CF_ACCOUNT_ID` / `CF_TOKEN`)

## Security Design

Management and collection features that can be exposed externally fail closed — nothing runs without authentication.

| Target | Control |
|---|---|---|
| Worker `POST /collect` | Disabled (503) unless `COLLECTOR_TOKEN` is set via `wrangler secret put`. Wrong token → 401. Destination restricted to the `ALLOWED_URL_PREFIXES` allowlist (default: only this project). Private / metadata / special-purpose hosts (SSRF) are blocked. Per-IP hourly limit (`COLLECT_RATE_LIMIT`, default 30). LLM mode (`instruction`) requires `consent: true` |
| Admin API (`/api/collectors` / `/api/collect/:id` / `/api/audit`) | Loopback-only by default. Remote access requires `COLLECTOR_ADMIN_TOKEN` matching the `x-admin-token` header. Remote without a token → 403 |
| Read-only API (`/api/population` / `/api/repos`) | No auth (public data reads only) |
| Data quality | `npm run smoke` verifies counts, categories, duplicates, value ranges, freshness (90 days), and source URLs in CI. The collector parser is DOM-based (cheerio) with contract tests for structural changes. Collector output is structurally validated with JSON Schema (ajv) |
| Monitoring | Collection failures are posted to `FAILURE_WEBHOOK_URL` (with cooldown). Every run is recorded in the audit log (`GET /api/audit`) |
| Accessibility | `eslint-plugin-jsx-a11y` is part of the CI lint (keyboard operability, labels, roles) |

## Documentation

- [DEV-MEMO](DEV-MEMO.md) — development notes

## Tests

```sh
npm test        # client Vitest (20 tests) + server node:test (17 tests)
npm run lint    # ESLint (includes a11y rules)
npm run build   # typecheck + Vite build
npm run smoke   # data-integrity smoke test (counts, freshness, duplicates, value ranges) in CI
```

## License

GPL v2 (GNU General Public License v2). See [LICENSE](LICENSE).

## Contact

GitHub: [https://github.com/watanabe3tipapa/graph-tutorial](https://github.com/watanabe3tipapa/graph-tutorial)