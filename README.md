# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.4.0-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/graph-tutorial.svg)](https://github.com/watanabe3tipapa/graph-tutorial/issues)

**EBPM。データを、たゆまず集め、可視化する。**

graph-tutorial は、Evidence-Based Policy Making（EBPM・証拠に基づく政策立案）のための
「エビデンス・パイプライン」です。日本の総人口データ（e-Stat）と EBPM 関連の GitHub リソースを
自律型コレクタで収集・更新し、ルーズリーフ・ノート調の LP で折れ線グラフやカテゴリ別グラフを都度生成します。

[日本語](README.md) | [English](README_EN.md)

## コンセプト

### なぜ「エビデンス・パイプライン」なのか

EBPM は「政策をエビデンスで設計し、検証する」ことです。しかし行政実務においてそれが浸透しないのは、
**データと手法を結びつける「道具」が揃っていない**からです。データは公開され、手法は論文にある。
このツールは、その間を「取得 → 整形 → 描画 → 公開」のコード化されたパイプラインで橋渡しします。

| 営み | graph-tutorial の対応物 |
|---|---|
| データを発見して取得する | `ebpm-repos` / `estat-population` コレクタが自動収集 |
| 常に最新のエビデンスを保つ | node-cron の定期実行 + 起動時ステイル検知 |
| 取得失敗でも止まらない | 既存データを保持する劣化処理 |
| 手法とリポジトリを俯瞰する | EBPM 関連 GitHub リソースを8カテゴリで整理 |
| 必要なグラフを都度生成する | カテゴリ / スター / 言語 / アクティビティの4種グラフ |

> なぜこのツールを作るのか、より詳しい考察は LP の「データ品質・仕組み」タブに掲載しています。

### 考察: EBPM に関連するツールとは何か

1. **データへのアクセスを開く** — 存在と取得方法を知らせないデータはエビデンスとして存在しない
2. **分析手法を民主化する** — 因果推論などの手法を実務者にも届ける
3. **再現性と透明性をコードで保証する** — パイプラインを公開すれば誰でも再現できる
4. **エビデンスを追い続ける** — データ収集の自動化で「常に最新」を保つ
5. **たゆまぬスモークテスト（正確性至上主義）** — 収集元は静かに壊れ続ける。正しさをテストで守り続ける
6. **提唱: 継続運用できる内製能力を残す** — EBPM ツールは、データと分析手順が組織に残り、変化に追随して更新できる状態を目指す。外部リソースも活用しつつ、検証と再現の手順を組織内に残すことを設計原則とする

## 特徴

- **自律データ収集**: `server/collectors/` の自己完結型コレクタ + node-cron の定期実行
- **起動時ステイル検知**: データが古ければサーバ起動時に自動更新
- **劣化処理**: API / ネットワーク失敗時は既存データを保持して停止しない
- **ハイブリッドデータ源**: API ライブ取得（`ESTAT_APP_ID` / `GITHUB_TOKEN`）+ 静的フォールバック
- **ルーズリーフ調 LP**: 手書き風罫線 + バインダーホール + 仕切りタブの5タブ構成（ホーム / デモ / EBPMカタログ / 導入する / データ品質・仕組み）
- **都度生成グラフ**: Chart.js でカテゴリ / スター数 / 言語 / 更新年別を切り替え描画
- **公開デモとローカル版の明確な区別**: 環境バッジ（このページで試せます / ローカルで実行 / 運用者向け）とデータ状態ストリップで、実行できる場所と利用範囲を明示
- **WEB-UI（実用コンソール）**: カタログ検索・ソート・CSV/JSON 出力・詳細モーダル・お気に入り（localStorage）・URL ハッシュで状態共有
- **データ鮮度バッジ**: 各データの最終更新日を表示し、古いデータには注意を喚起（GitHub Pages でも動作）
- **コレクタ実行 WEB-UI**: 「導入する」タブ（Step 3）から各コレクタをワンクリック実行（サーバ起動時のみ）
- **正確性至上主義**: `npm run smoke` によるデータ整合性スモークテストを CI で毎回実行
- **任意URL情報収集は公開停止**: 認証・利用量制限・宛先制御などの安全対策が完了するまで、公開 LP には任意URL入力・実行 UI を置かない（Worker 自体はサーバー側コレクタでの運用に限定）

## クイックスタート

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---|---|
| Node.js | >= 20 | `node --version` |

### 1. リポジトリを取得する

```bash
git clone https://github.com/watanabe3tipapa/graph-tutorial.git
cd graph-tutorial
```

### 2. インストールして起動する

```bash
npm install
npm run dev        # 開発: http://localhost:5173（API は 3000 へプロキシ）
npm run build && npm start   # 本番: http://localhost:3000
```

### 3. データを収集する

```bash
npm run collect            # 全コレクタを実行
npm run collect:list       # 登録コレクタ一覧
npm run collect:repos      # EBPM リポジトリのみ
npm run collect:population # 人口データのみ
npm run collect:kitesurf   # Kitesurf スナップショットのみ
```

LLM / API 連携は環境変数で有効化します（`.env.example` を参照）:

```bash
export ESTAT_APP_ID=...     # e-Stat 統計データ API（人口データを最新化）
export GITHUB_TOKEN=...     # GitHub API（スター数・更新日を最新化）
export CF_ACCOUNT_ID=...    # Cloudflare（Kitesurf スナップショット収集）
export CF_TOKEN=...         # Cloudflare API トークン（権限: Browser Rendering - Edit）
```

## 環境変数

| 変数 | 説明 |
|---|---|
| `ESTAT_APP_ID` | e-Stat 統計データ API のアプリケーションID |
| `GITHUB_TOKEN` | GitHub API トークン |
| `CF_ACCOUNT_ID` | Cloudflare アカウント ID（Kitesurf コレクタ用。未設定ならスキップ） |
| `CF_TOKEN` | Cloudflare API トークン（権限: Browser Rendering - Edit） |
| `COLLECTOR_DISABLED` | `1` で起動時の自動収集・スケジューラを無効化 |
| `COLLECTOR_ADMIN_TOKEN` | 管理 API（`/api/collectors`・`/api/collect/:id`・`/api/audit`）のリモート認証トークン。未設定なら管理 API はループバック（ローカル）からのみ許可（fail closed） |
| `TRUST_PROXY` | `1` で `X-Forwarded-For` を信頼（リバースプロキシ配下で管理 API の IP 判定に使用） |
| `FAILURE_WEBHOOK_URL` | 収集失敗通知のウェブフック URL（Slack / Teams 等の汎用ウェブフック。未設定なら通知しない） |
| `FAILURE_NOTIFY_INTERVAL_MINUTES` | 同一コレクタの失敗通知クールダウン（分。既定 360） |

## クライアントビルド時変数

| 変数 | 説明 |
|---|---|
| `VITE_KITESURF_WORKER_URL` | Cloudflare Worker の URL（サーバー側コレクタ運用用。公開 LP の「情報収集」UI は安全対策完了まで公開停止中） |

## アーキテクチャ

```
graph-tutorial/
├── server/                 # Express 5 JSON API
│   ├── collectors/         # 自律型コレクタ（1フォルダ = 1データ源）
│   │   ├── ebpm-repos/         # EBPM 関連 GitHub リソース一覧を収集
│   │   ├── estat-population/   # e-Stat の人口推計を収集
│   │   └── kitesurf-snapshot/  # Cloudflare Kitesurf で README を収集（CF_* 設定時）
│   ├── lib/
│   │   ├── collector-registry.js   # 自動発見 + 実行 + cron + ステイル検知
│   │   ├── estat.js                # e-Stat 取得 + スナップショット/フォールバック
│   │   ├── github.js               # GitHub API 取得 + フォールバック
│   │   └── kitesurf.js             # Kitesurf REST API ラッパ（/markdown）
│   ├── data/                # コレクタ出力（collectedAt 付き）
│   └── scripts/run-collectors.js   # CLI
├── worker/                 # Cloudflare Workers（情報収集サーバー）
│   ├── wrangler.toml       # browser / ai / kv バインディング + cron
│   └── src/index.ts        # POST /collect（LLM 指示対応）+ GET /snapshot + CORS
└── client/                 # Vite + React + TypeScript SPA
    └── src/
        ├── App.tsx                 # ルーズリーフ調タブナビ（ARIA Tabs + URL ハッシュ同期）
        ├── hash.ts                 # タブ / フィルタ状態の URL 同期
        ├── download.ts             # CSV / JSON エクスポート（テスト済み）
        ├── repoStats.ts            # グラフ集計（純関数・テスト済み）
        └── components/             # 各タブの実装
            ├── Home.tsx              # ホーム（ヒーロー + 3CTA + データ状態ストリップ + 比較表）
            ├── CapabilityBadge.tsx   # 環境バッジ（デモ / ローカル / 運用者 / 公開停止）
            ├── DataStatusStrip.tsx   # データ状態ストリップ（取得日・件数・鮮度）
            ├── PopulationView.tsx    # 人口デモ（+ PopulationChart.tsx）
            ├── Catalog.tsx           # EBPMカタログ（探索 / 概観の2セグメント）
            ├── RepoModal.tsx         # リポジトリ詳細モーダル
            ├── FreshnessBadge.tsx    # データ鮮度バッジ
            ├── CollectorControls.tsx # コレクタ実行 WEB-UI
            ├── Usage.tsx             # 導入する（3ステップ）
            └── Quality.tsx           # データ品質・仕組み（出典・鮮度・設計思想）
```

## API

| エンドポイント | 内容 |
|---|---|
| `GET /api/population` | 日本の総人口（labels / data / source / unit / isLive / collectedAt） |
| `GET /api/repos` | EBPM リポジトリカタログ（categories / repos / isLive / sourceUrl / collectedAt） |
| `GET /api/collectors` | 登録コレクタ一覧（id / name / cron / collectedAt / stale） |
| `POST /api/collect/:id` | コレクタを実行（成功 / スキップ / 失敗を JSON で返却） |
| `GET /api/audit` | 監査ログ（直近の実行履歴。管理 API と同様の認証保護） |

### Cloudflare Worker のエンドポイント

| エンドポイント | 内容 |
|---|---|
| `POST /collect` | Kitesurf で情報収集（body: `{ url, action }` または `{ instruction }`） |
| `GET /snapshot` | Cron + KV で保存した最新スナップショット |
| `GET /health` | Worker / Kitesurf / AI / KV の稼働確認 |

## データ源

- **EBPM リポジトリカタログ**: [EBPM 関連 GitHub リソース一覧](https://pelican-white-paper.pages.dev/ebpm-github-resources)（8カテゴリ / 38リポジトリ）
- **人口データ**: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』
- **graph-tutorial スナップショット**: Cloudflare Kitesurf（Browser Run `/markdown`）で収集した README

## Cloudflare Kitesurf 連携

graph-tutorial のバックエンドは **GitHub Pages（LP・クライアント）+ Cloudflare Workers（情報収集サーバー）** の構成で
Kitesurf（Browser Run の軽量・エージェント向けブラウザ）を利用できます。

> **公開停止中**: 任意URLの情報収集（Kitesurf）は、認証・利用量制限・宛先制御などの安全対策が完了するまで
> 公開 LP に UI を置いていません。Worker はサーバー側コレクタ（`server/collectors/kitesurf-snapshot`）での
> 運用に限定し、一般からの任意URL実行を受け付けない構成です。

- **Worker**: `POST /collect`（認証必須・宛先許可リスト・利用量制限）、Cron + KV で定期スナップショット（`GET /snapshot`）
- **サーバー側コレクタ**: `server/collectors/kitesurf-snapshot`（`.env` の `CF_ACCOUNT_ID` / `CF_TOKEN` で有効化）

## セキュリティ設計

外部に露出しうる管理・収集機能は、原則として「認証がない限り実行できない」状態（fail closed）にしています。

| 対象 | 対策 |
|---|---|
| Worker `POST /collect` | `COLLECTOR_TOKEN`（`wrangler secret put` で設定）が無い限り収集は無効（503）。トークン不一致は 401。宛先は `ALLOWED_URL_PREFIXES` の許可リストに限定（未設定なら自プロジェクトのみ）。プライベート IP・メタデータ・特殊用途ホスト（SSRF）を遮断。呼出元 IP ごとに時間あたり回数上限（`COLLECT_RATE_LIMIT`、既定 30 回）。LLM 指示（`instruction`）は `consent: true` が必須 |
| 管理 API（`/api/collectors`・`/api/collect/:id`・`/api/audit`） | ループバック接続のみ許可。リモートからは `COLLECTOR_ADMIN_TOKEN` と `x-admin-token` ヘッダの一致が必須。トークン未設定かつリモートは 403 |
| 閲覧 API（`/api/population`・`/api/repos`） | 認証不要（公開データの読み取りのみ） |
| データ品質 | `npm run smoke` が件数・カテゴリ数・重複・値域・鮮度（90日）・出典 URL を CI 上で検証。収集パーサは DOM ベース（cheerio）で見出しと表を文書構造で関連付け、契約テストで構造変化を検知。コレクタ出力は JSON Schema（ajv）で構造検証 |
| 監視 | 収集失敗は `FAILURE_WEBHOOK_URL` に通知（クールダウン付き）。全実行は監査ログ（`GET /api/audit`）に記録 |
| アクセシビリティ | `eslint-plugin-jsx-a11y` を lint に常設し、キーボード操作・ラベル・role を CI で検証 |

## ドキュメント

- [DEV-MEMO](DEV-MEMO.md) — 開発メモ

## テスト

```sh
npm test        # クライアント Vitest（20 tests）+ サーバー node:test（17 tests）
npm run lint    # ESLint（a11y ルール含む）
npm run build   # 型チェック + Vite ビルド
npm run smoke   # データ整合性スモークテスト（件数・鮮度・重複・値域を CI 上でも検証）
```

## ライセンス

GPL v2（GNU General Public License v2）。詳細は [LICENSE](LICENSE) を参照。

## 連絡先

GitHub: [https://github.com/watanabe3tipapa/graph-tutorial](https://github.com/watanabe3tipapa/graph-tutorial)