# DEV-MEMO

graph-tutorial プロジェクトの開発メモ。

## 概要

Evidence-Based Policy Making（EBPM）のための「エビデンス・パイプライン」。
日本の総人口データ（e-Stat）と EBPM 関連 GitHub リソースを、
自律型コレクタで収集・更新し、ルーズリーフ・ノート調の LP で可視化する。

- リポジトリ名: graph-tutorial
- バージョン: v0.2.0
- 最終更新: 2026-08-17

## 技術スタック

| 用途 | 技術 |
|------|------|
| フロントエンド | React 18 + TypeScript |
| ビルドツール | Vite 6 |
| グラフ描画 | Chart.js + react-chartjs-2 |
| バックエンド | Express 5（JSON API） |
| データ収集 | 自律コレクタ + node-cron |
| セキュリティ | helmet |
| 環境変数 | dotenv |
| テスト | Vitest + Testing Library |
| 静的解析 / 整形 | ESLint + Prettier |
| 並列起動 | concurrently（npm workspaces） |

## アーキテクチャ（モノレポ）

npm workspaces により `server` / `client` の 2 パッケージを管理。

```
graph-tutorial/
├── package.json          # ルート（workspaces + スクリプト）
├── server/
│   ├── app.js            # API: /api/population, /api/repos + 静的配信
│   ├── bin/www           # サーバ起動 + コレクタ起動フック
│   ├── collectors/       # 自律型コレクタ（1フォルダ = 1データ源）
│   │   ├── ebpm-repos/collector.js
│   │   └── estat-population/collector.js
│   ├── lib/
│   │   ├── collector-registry.js   # 自動発見 + 実行 + cron + スタル検知
│   │   ├── estat.js                # e-Stat 取得 + スナップショット/フォールバック
│   │   └── github.js               # GitHub API 取得 + フォールバック
│   ├── data/                       # コレクタ出力（collectedAt 付き）
│   └── scripts/run-collectors.js   # CLI
└── client/               # Vite + React SPA（ルーズリーフ調 LP）
    ├── src/
    │   ├── App.tsx                 # タブナビ（考察/データ収集/人口/EBPM/使い方）
    │   ├── repoStats.ts            # グラフ集計（純関数・テスト済み）
    │   └── components/
    │       ├── Consideration.tsx   # EBPM ツールの考察（LP 冒頭）
    │       ├── Framework.tsx       # データ収集フレームワーク解説
    │       ├── Usage.tsx           # 使い方
    │       ├── PopulationView.tsx / PopulationChart.tsx
    │       └── ReposView.tsx / ReposChart.tsx
```

## データ収集フレームワーク（自律コレクタ）

各コレクタは `server/collectors/<id>/collector.js` の自己完結モジュール。

```js
module.exports = {
  id: 'ebpm-repos',
  name: 'EBPM 関連 GitHub リソース',
  cron: '0 3 * * *',        // 定期実行時刻
  staleAfterMs: 86400000,   // スタル判定（既定 24h）
  async collect() { ... },  // 取得 + 正規化
  validate(data) { ... },   // スキーマ検証（任意）
}
```

### 自律性の4層

1. **スケジュール**: node-cron で `cron` 時刻に定期実行
2. **起動時スタル検知**: サーバ起動時、`collectedAt` が古いコレクタを自動更新
3. **劣化処理**: 取得失敗時は既存データを保持（空上書きしない）
4. **CLI / CI**: `npm run collect` で手動・CI からも実行

`COLLECTOR_DISABLED=1` で起動時の自動収集・スケジューラを無効化できる。

## API

| エンドポイント | 内容 |
|----------------|------|
| `GET /api/population` | 日本の総人口（labels/data/source/unit/isLive） |
| `GET /api/repos` | EBPM リポジトリカタログ（categories/repos/isLive/sourceUrl） |

## 環境変数

`.env.example` を `.env` にコピーして設定。

| 変数 | 説明 |
|------|------|
| `ESTAT_APP_ID` | e-Stat API アプリケーションID（人口データを最新化） |
| `GITHUB_TOKEN` | GitHub API トークン（スター数・更新日を最新化） |
| `COLLECTOR_DISABLED` | `1` で自動収集・スケジューラを無効化 |

## データ源

- **EBPM リポジトリカタログ**:
  https://pelican-white-paper.pages.dev/ebpm-github-resources
  （8カテゴリ / 38リポジトリ。`ebpm-repos` コレクタが自動収集）
- **人口データ**: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』

## 起動方法

```bash
npm install
npm run dev        # 開発: http://localhost:5173（API は 3000 へプロキシ）
npm run build      # 本番ビルド
npm start          # 本番: http://localhost:3000
```

### データ収集コマンド

```bash
npm run collect            # 全コレクタ実行
npm run collect:list       # 登録コレクタ一覧
npm run collect:repos      # EBPM リポジトリのみ
npm run collect:population # 人口データのみ
```

### 開発コマンド

```bash
npm run lint
npm run format
npm test
```

## 今後の拡張メモ

- 都道府県別の人口グラフ（棒グラフ / 地図）
- 男女別人口の折れ線グラフ
- 統計テーマの選択 UI
- コレクタのスキーマバリデーション強化（JSON Schema）
- コレクタのスケジュール設定 UI
- GitHub Actions によるデータ更新コミット
- API 側のテスト追加