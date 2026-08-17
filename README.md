# graph-tutorial

[![Version](https://img.shields.io/badge/version-v0.2.7-blue.svg)](https://github.com/watanabe3tipapa/graph-tutorial/releases)
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

> なぜこのツールを作るのか、より詳しい考察は LP の「考察」タブに掲載しています。

### 考察: EBPM に関連するツールとは何か

1. **データへのアクセスを開く** — 存在と取得方法を知らせないデータはエビデンスとして存在しない
2. **分析手法を民主化する** — 因果推論などの手法を実務者にも届ける
3. **再現性と透明性をコードで保証する** — パイプラインを公開すれば誰でも再現できる
4. **エビデンスを追い続ける** — データ収集の自動化で「常に最新」を保つ
5. **たゆまぬスモークテスト（正確性至上主義）** — 収集元は静かに壊れ続ける。正しさをテストで守り続ける
6. **提唱: セルフビルドのすすめ** — EBPM ツールは「自分で作って、自分で使う」ことが正しい。コンサル等の第三者委託は、知識が組織に残らない・運用が契約依存になる・ブラックボックス化する等の理由で避けるべき

## 特徴

- **自律データ収集**: `server/collectors/` の自己完結型コレクタ + node-cron の定期実行
- **起動時ステイル検知**: データが古ければサーバ起動時に自動更新
- **劣化処理**: API / ネットワーク失敗時は既存データを保持して停止しない
- **ハイブリッドデータ源**: API ライブ取得（`ESTAT_APP_ID` / `GITHUB_TOKEN`）+ 静的フォールバック
- **ルーズリーフ調 LP**: 手書き風罫線 + バインダーホール + 仕切りタブの6タブ構成
- **都度生成グラフ**: Chart.js でカテゴリ / スター数 / 言語 / 更新年別を切り替え描画
- **WEB-UI（実用コンソール）**: カタログ検索・ソート・CSV/JSON 出力・詳細モーダル・お気に入り（localStorage）・URL ハッシュで状態共有
- **データ鮮度バッジ**: 各データの最終更新日を表示し、古いデータには注意を喚起（GitHub Pages でも動作）
- **コレクタ実行 WEB-UI**: 「データ収集」タブから各コレクタをワンクリック実行（サーバ起動時のみ）
- **正確性至上主義**: `npm run smoke` によるデータ整合性スモークテストを CI で毎回実行
- **モダンSPA**: Vite + React + TypeScript（npm workspaces のモノレポ）

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
```

LLM / API 連携は環境変数で有効化します（`.env.example` を参照）:

```bash
export ESTAT_APP_ID=...     # e-Stat 統計データ API（人口データを最新化）
export GITHUB_TOKEN=...     # GitHub API（スター数・更新日を最新化）
```

## 環境変数

| 変数 | 説明 |
|---|---|
| `ESTAT_APP_ID` | e-Stat 統計データ API のアプリケーションID |
| `GITHUB_TOKEN` | GitHub API トークン |
| `COLLECTOR_DISABLED` | `1` で起動時の自動収集・スケジューラを無効化 |

## アーキテクチャ

```
graph-tutorial/
├── server/                 # Express 5 JSON API
│   ├── collectors/         # 自律型コレクタ（1フォルダ = 1データ源）
│   │   ├── ebpm-repos/         # EBPM 関連 GitHub リソース一覧を収集
│   │   └── estat-population/   # e-Stat の人口推計を収集
│   ├── lib/
│   │   ├── collector-registry.js   # 自動発見 + 実行 + cron + ステイル検知
│   │   ├── estat.js                # e-Stat 取得 + スナップショット/フォールバック
│   │   └── github.js               # GitHub API 取得 + フォールバック
│   ├── data/                # コレクタ出力（collectedAt 付き）
│   └── scripts/run-collectors.js   # CLI
└── client/                 # Vite + React + TypeScript SPA
    └── src/
        ├── App.tsx                 # ルーズリーフ調タブナビ（URL ハッシュ同期）
        ├── hash.ts                 # タブ / フィルタ状態の URL 同期
        ├── download.ts             # CSV / JSON エクスポート（テスト済み）
        ├── repoStats.ts            # グラフ集計（純関数・テスト済み）
        └── components/             # 考察 / データ収集 / 人口 / EBPM / カタログ / 使い方
            ├── Catalog.tsx         # 検索・ソート・出力・お気に入り
            ├── RepoModal.tsx       # リポジトリ詳細モーダル
            ├── FreshnessBadge.tsx  # データ鮮度バッジ
            └── CollectorControls.tsx # コレクタ実行 WEB-UI
```

## API

| エンドポイント | 内容 |
|---|---|
| `GET /api/population` | 日本の総人口（labels / data / source / unit / isLive / collectedAt） |
| `GET /api/repos` | EBPM リポジトリカタログ（categories / repos / isLive / sourceUrl / collectedAt） |
| `GET /api/collectors` | 登録コレクタ一覧（id / name / cron / collectedAt / stale） |
| `POST /api/collect/:id` | コレクタを実行（成功 / スキップ / 失敗を JSON で返却） |

## データ源

- **EBPM リポジトリカタログ**: [EBPM 関連 GitHub リソース一覧](https://pelican-white-paper.pages.dev/ebpm-github-resources)（8カテゴリ / 38リポジトリ）
- **人口データ**: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』

## ドキュメント

- [DEV-MEMO](DEV-MEMO.md) — 開発メモ

## テスト

```sh
npm test        # Vitest（18 tests）
npm run lint    # ESLint
npm run build   # 型チェック + Vite ビルド
npm run smoke   # データ整合性スモークテスト
```

## ライセンス

本リポジトリのライセンスは現在未指定です。

## 連絡先

GitHub: [https://github.com/watanabe3tipapa/graph-tutorial](https://github.com/watanabe3tipapa/graph-tutorial)