# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.4.0-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/graph-tutorial.svg)](https://github.com/watanabe3tipapa/graph-tutorial/issues)

ホームページ: https://watanabe3tipapa.github.io/graph-tutorial/

日本語 | [English](README_EN.md)

概要

graph-tutorial は、Evidence-Based Policy Making（EBPM：証拠に基づく政策立案）を支援する「エビデンス・パイプライン」です。日本の人口データ（e-Stat）と EBPM 関連 GitHub リソースを自律収集し、整形・可視化してルーズリーフ調の LP 上で提示します。収集は複数の自己完結型コレクタで行い、データ鮮度・耐障害性・可視化を重視しています。

主要な内容・特徴

- 自律データ収集: server/collectors にあるコレクタ群（例: ebpm-repos, estat-population, kitesurf-snapshot）を node-cron で定期実行
- 起動時ステイル検知: サーバ起動時にデータの鮮度をチェックし、古ければ更新を試行
- 劣化処理: 取得失敗時にも既存データを保持し、停止しない設計
- ハイブリッドデータ源: e-Stat / GitHub API のライブ取得と静的フォールバックを併用
- ルーズリーフ調 LP: ホーム / デモ / EBPMカタログ / 導入する / データ品質・仕組み のタブ構成
- 都度生成グラフ: Chart.js によるカテゴリ／スター数／言語／更新年別のグラフ生成
- WEB-UI（実用コンソール）: カタログ検索・ソート・CSV/JSON 出力・詳細表示・お気に入り（localStorage）など
- データ鮮度と公開区分の明示: データ最終更新日・鮮度バッジ、公開デモとローカル実行の区別
- セキュリティ方針: 管理・収集機能は fail-closed（認証が無ければ実行不可）を原則に実装
- テストと品質: npm run smoke によるデータ整合性スモークテスト、クライアントとサーバーのテスト・lint を用意

クイックスタート（確認済みの手順）

前提: Node.js >= 20（README に記載）

リポジトリ取得:

```bash
git clone https://github.com/watanabe3tipapa/graph-tutorial.git
cd graph-tutorial
```

インストールと起動（開発／本番）:

```bash
npm install
npm run dev        # 開発: client と server を concurrently で起動
npm run build && npm start   # 本番: ビルドして server を起動
```

コレクタの実行（server ワークスペース内の npm スクリプトに基づく）:

```bash
npm run collect            # 全コレクタを実行
npm run collect:list       # 登録コレクタ一覧
npm run collect:repos      # EBPM リポジトリのみ
npm run collect:population # 人口データのみ
npm run collect:kitesurf   # Kitesurf スナップショットのみ
```

環境変数（README に記載されている変数を要約）

- ESTAT_APP_ID: e-Stat API 用アプリケーションID
- GITHUB_TOKEN: GitHub API トークン
- CF_ACCOUNT_ID / CF_TOKEN: Cloudflare Kitesurf / Worker 用（未設定なら該当コレクタはスキップ）
- COLLECTOR_DISABLED: `1` で自動収集・スケジューラ無効化
- COLLECTOR_ADMIN_TOKEN: 管理 API のリモート認証トークン（未設定なら管理 API はローカルのみ許可）
- TRUST_PROXY, FAILURE_WEBHOOK_URL, FAILURE_NOTIFY_INTERVAL_MINUTES など（README を参照）

ビルド時のクライアント変数:

- VITE_KITESURF_WORKER_URL: Cloudflare Worker の URL（クライアントビルド用）

アーキテクチャ（概要）

- server/: Express 5 ベースの JSON API とコレクタ群
  - collectors/: 自律型コレクタ（1フォルダ=1データ源）
  - data/: コレクタ出力（collectedAt を含む）
  - scripts/run-collectors.js: CLI エントリ
- client/: Vite + React + TypeScript SPA（ルーズリーフ調 UI）
- worker/: Cloudflare Workers（情報収集用のエンドポイント・Snapshot・health など）

README 内のAPI（公開されている API エンドポイント）

- GET /api/population — 日本の総人口（labels / data / source / unit / isLive / collectedAt）
- GET /api/repos — EBPM リポジトリカタログ（categories / repos / isLive / sourceUrl / collectedAt）
- GET /api/collectors — 登録コレクタ一覧（id / name / cron / collectedAt / stale）
- POST /api/collect/:id — コレクタを実行（成功 / スキップ / 失敗 を返す）
- GET /api/audit — 監査ログ（直近の実行履歴。管理 API と同様の認証保護）

Cloudflare Worker のエンドポイント（README に記載）

- POST /collect — Kitesurf で情報収集（body: { url, action } または { instruction }）
- GET /snapshot — Cron + KV に保存した最新スナップショット
- GET /health — Worker / Kitesurf / AI / KV の稼働確認

データ源（README に記載）

- EBPM リポジトリカタログ: EBPM 関連 GitHub リソース一覧（8カテゴリ / 38リポジトリ）
- 人口データ: e-Stat（総務省統計局『人口推計』）
- graph-tutorial スナップショット: Cloudflare Kitesurf による README 収集

Cloudflare Kitesurf 連携について

- Worker とサーバー側コレクタの両面で利用可能な設計
- 任意 URL の公開収集 UI は「公開停止中」（認証・利用量制限・宛先制御の対策が完了するまで非公開）
- server/collectors/kitesurf-snapshot は CF_* 環境変数で有効化

セキュリティ設計（要点）

- 管理・収集系は fail-closed を原則に設定（認証トークン未設定時はローカルのみ許可など）
- Worker の POST /collect はトークンと許可リストで制限（未設定時は制限付き）
- 収集失敗は FAILURE_WEBHOOK_URL に通知（未設定なら通知なし）
- データ出力は JSON Schema 検証（ajv 等）やスモークテストで品質を担保

テスト・開発関連（README と package.json に基づく）

- npm test — クライアント（Vitest）とサーバー（node:test）のテストを実行
- npm run lint — ESLint（アクセシビリティルール含む）
- npm run build — 型チェック + Vite ビルド
- npm run smoke — サーバーのデータ整合性スモークテスト

ドキュメント

- 開発メモ: DEV-MEMO.md

開発・保守状態

- リポジトリはアーカイブされていません（GitHub 上のアーカイブ状態: false）。
- 最終更新日（リポジトリ情報）: 2026-08-20

ライセンス

- GPL v2（LICENSE を参照）

連絡先

- GitHub: https://github.com/watanabe3tipapa/graph-tutorial
