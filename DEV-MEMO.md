# DEV-MEMO

graph-tutorial プロジェクトの開発メモ。

## 概要

Evidence-Based Policy Making（EBPM）のための「エビデンス・パイプライン」。
日本の総人口データ（e-Stat）と EBPM 関連 GitHub リソースを、
自律型コレクタで収集・更新し、ルーズリーフ・ノート調の LP で可視化する。

- リポジトリ名: graph-tutorial
- バージョン: v0.2.7
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
├── .github/workflows/
│   ├── ci.yml            # lint / test / smoke / build
│   └── pages.yml         # GitHub Pages デプロイ（静的フォールバックで API なしでも動作）
├── server/
│   ├── app.js            # API: /api/population, /api/repos + 静的配信
│   ├── bin/www           # サーバ起動 + コレクタ起動フック
│   ├── collectors/       # 自律型コレクタ（1フォルダ = 1データ源）
│   │   ├── ebpm-repos/collector.js
│   │   └── estat-population/collector.js
│   ├── lib/
│   │   ├── collector-registry.js   # 自動発見 + 実行 + cron + ステイル検知
│   │   ├── estat.js                # e-Stat 取得 + スナップショット/フォールバック
│   │   └── github.js               # GitHub API 取得 + フォールバック
│   ├── data/                       # コレクタ出力（collectedAt 付き）
│   └── scripts/
│       ├── run-collectors.js       # CLI
│       └── smoke-test.js           # データ整合性スモークテスト
└── client/               # Vite + React SPA（ルーズリーフ調 LP）
    ├── src/
    │   ├── App.tsx                 # タブナビ（考察/データ収集/人口/EBPM/カタログ/使い方）＋URLハッシュ同期
    │   ├── hash.ts                 # タブ / フィルタ状態の URL 同期
    │   ├── download.ts             # CSV / JSON エクスポート（テスト済み）
    │   ├── repoStats.ts            # グラフ集計（純関数・テスト済み）
    │   ├── api.ts                  # API 取得 + 静的フォールバック
    │   └── components/
    │       ├── Consideration.tsx   # EBPM ツールの考察（LP 冒頭・セルフビルドのすすめ）
    │       ├── Framework.tsx       # データ収集フレームワーク解説
    │       ├── Usage.tsx           # 使い方
    │       ├── Catalog.tsx         # カタログ（検索・ソート・CSV/JSON出力・お気に入り）
    │       ├── RepoModal.tsx       # リポジトリ詳細モーダル
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
  staleAfterMs: 86400000,   // ステイル判定（既定 24h）
  async collect() { ... },  // 取得 + 正規化
  validate(data) { ... },   // スキーマ検証（任意）
}
```

### 自律性の4層

1. **スケジュール**: node-cron で `cron` 時刻に定期実行
2. **起動時ステイル検知**: サーバ起動時、`collectedAt` が古いコレクタを自動更新
3. **劣化処理**: 取得失敗時は既存データを保持（空上書きしない）
4. **CLI / CI**: `npm run collect` で手動・CI からも実行

`COLLECTOR_DISABLED=1` で起動時の自動収集・スケジューラを無効化できる。

### 正確性至上主義（スモークテスト）

収集元は常に変化し、ツールは静かに壊れ続ける。正しさを「守り続ける」ため3層で常時検知する。

1. **コレクタの検証**: `validate()` が取得データのスキーマを確認
2. **劣化処理**: 取得失敗時は既存データを保持
3. **継続的スモークテスト**: `npm run smoke`（`server/scripts/smoke-test.js`）が保存済みデータの整合性を検証。CI 上でも毎回実行

## 考察（LP 冒頭）

LP の「考察」タブでは、EBPM ツールのあるべき姿を6点で論じている。

1. データへのアクセスを開く
2. 分析手法を民主化する
3. 再現性と透明性をコードで保証する
4. エビデンスを追い続ける
5. たゆまぬスモークテスト（正確性至上主義）
6. **提唱: セルフビルドのすすめ** — 「自分で作って、自分で使う」が正しい。第三者委託は知識が組織に残らない・運用が契約依存になる等の理由で避けるべき

## WEB-UI（実用コンソール）

クライアント完結で実装（GitHub Pages でも動作）。

- **カタログ検索 / ソート**（★・名前・言語・更新）
- **CSV / JSON エクスポート**（BOM 付き CSV、Excel 対応）
- **リポジトリ詳細モーダル**（ESC / オーバーレイで閉じる）
- **お気に入り**（localStorage `ebpm-favorites` + 「お気に入りのみ」絞り込み）
- **日本の人口**: 年範囲選択・年別テーブル・CSV 出力
- **URL ハッシュ同期**: `#repos?cat=...` / `#catalog?q=...&sort=...` で状態を共有・復元
- **データ鮮度バッジ**（`FreshnessBadge.tsx`）: `collectedAt` から「データ更新: YYYY-MM-DD」を表示。7日以上経過で「古い可能性があります」と警告（静的フォールバックにも `collectedAt` を同梱し、Pages でも動作）
- **コレクタ実行 WEB-UI**（`CollectorControls.tsx`）: 「データ収集」タブでコレクタ一覧（cron / 最終更新 / ステイル警告）と「実行」ボタンを表示。実行結果をインライン表示（成功 / スキップ / 失敗）。サーバ起動時のみ有効で、Pages では「サーバ起動時のみ利用できます」に劣化表示

## API

| エンドポイント | 内容 |
|----------------|------|
| `GET /api/population` | 日本の総人口（labels/data/source/unit/isLive/collectedAt） |
| `GET /api/repos` | EBPM リポジトリカタログ（categories/repos/isLive/sourceUrl/collectedAt） |
| `GET /api/collectors` | 登録コレクタ一覧（id/name/cron/collectedAt/stale） |
| `POST /api/collect/:id` | コレクタを実行（ok / skipped / error を JSON で返却） |

## トラブルシューティング: API の 304（Not Modified）問題

### 症状

ブラウザで WEB-UI を操作中、`/api/*` のレスポンスが **304 Not Modified** になり、
本来の JSON が返ってこない。結果として以下の誤動作が発生する。

- `/api/population` / `/api/repos` が 304 → クライアントが `res.ok === false` と判定し、
  本来の API データではなく**静的フォールバック**を表示してしまう
- `/api/collectors` が 304 → コレクタ実行 UI が「サーバ起動時のみ利用できます」と
  誤った劣化表示をしてしまう

### 原因

Express はデフォルトで全レスポンスに **weak ETag**（`W/"..."`）を付与する。
ブラウザは `If-None-Match` で再検証（revalidation）を送り、内容が同一なら
サーバは **304 + 空ボディ** を返す。

`fetch()` の既定キャッシュモードではこの 304 がそのまま `Response` として解決され、
`response.ok` は **false** になる（304 は 200–299 に含まれない）。
そのため「レスポンスが異常」と誤判定してフォールバック / 劣化表示に落ちていた。

### 修正（サーバ + クライアント両側で対策）

**サーバ側**（`server/app.js`）: レスポンスをキャッシュ対象から外す

```js
app.disable('etag');          // アプリ全体の ETag 付与を無効化

// /api 配下はキャッシュ禁止（ヘッダ: Cache-Control: no-store）
app.use('/api', function(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

// 静的配信（index.html 等）も ETag / Last-Modified を無効化
// （express.static は独自に ETag と Last-Modified を付与し、If-None-Match / If-Modified-Since で 304 を返す）
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { etag: false, lastModified: false }));
}
```

> 補足: `app.disable('etag')` は Express のルートレスポンスにのみ効く。
> `express.static`（`serve-static`）は独自の ETag **と Last-Modified** を付与し、
> `If-None-Match` / `If-Modified-Since` それぞれで 304 を返す。消すには
> `express.static(path, { etag: false, lastModified: false })` の両指定が必要。
> `lastModified` を消し忘れると、`etag: false` でも `If-Modified-Since` で 304 が残る。

**クライアント側**: API の `fetch` すべてに `cache: 'no-store'` を付与
（プロキシ等の中間キャッシュでも 304 を防ぐ二重の保険）

- `client/src/api.ts`（`fetchPopulation` / `fetchRepos`）
- `client/src/components/CollectorControls.tsx`（一覧取得 / 実行POST）

### 検証方法

```bash
COLLECTOR_DISABLED=1 PORT=3999 node server/bin/www &
# 初回取得 → レスポンスヘッダに ETag が無く、Cache-Control: no-store があること
curl -sD - -o /dev/null http://localhost:3999/api/collectors
# If-None-Match で再検証しても 304 ではなく 200 が返ること
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "If-None-Match: W/\"dummy\"" http://localhost:3999/api/collectors
```

修正前は再検証で `304`、修正後は `200` が返る。

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
npm test          # Vitest（16 tests）
npm run smoke     # データ整合性スモークテスト
```

## GitHub Actions

- **CI**（`ci.yml`）: push / PR で lint → test → smoke → build
- **Pages**（`pages.yml`）: main push で `client/dist` をデプロイ。
  `client/src/static/` に同梱したフォールバックデータにより API なしでも全機能が動作

## 今後の拡張メモ

- データ鮮度バッジ（updatedAt / collectedAt の表示と注意喚起）
- 「データ収集」タブからのコレクタ手動実行 UI（サーバ起動時のみ）
- 都道府県別の人口グラフ（棒グラフ / 地図）
- 男女別人口の折れ線グラフ
- 統計テーマの選択 UI
- コレクタのスキーマバリデーション強化（JSON Schema）
- コレクタのスケジュール設定 UI
- GitHub Actions によるデータ更新コミット
- API 側のテスト追加