# DEV-MEMO

graph-tutorial プロジェクトの開発メモ。

## 概要

Evidence-Based Policy Making（EBPM）のための「エビデンス・パイプライン」。
日本の総人口データ（e-Stat）と EBPM 関連 GitHub リソースを、
自律型コレクタで収集・更新し、ルーズリーフ・ノート調の LP で可視化する。

- リポジトリ名: graph-tutorial
- バージョン: v0.4.0
- 最終更新: 2026-08-21

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
| Cloudflare Workers | wrangler + workers-types（worker/ パッケージ） |

## アーキテクチャ（モノレポ）

npm workspaces により `server` / `client` / `worker` の 3 パッケージを管理。

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
│   │   ├── ebpm-repos/collector.js   # cheerio DOM パーサ（見出し→直後の表、列見出し名で特定）
│   │   │   └── fixtures/source.html  # 収集元 HTML スナップショット（契約テスト用）
│   │   ├── estat-population/collector.js
│   │   └── kitesurf-snapshot/collector.js   # Kitesurf で README 収集（CF_* 設定時）
│   ├── lib/
│   │   ├── collector-registry.js   # 自動発見 + 実行 + cron + ステイル検知
│   │   ├── estat.js                # e-Stat 取得 + スナップショット/フォールバック
│   │   ├── github.js               # GitHub API 取得 + フォールバック
│   │   └── kitesurf.js             # Kitesurf REST API ラッパ（/markdown）
│   ├── data/                       # コレクタ出力（collectedAt 付き）
│   ├── scripts/
│   │   ├── run-collectors.js       # CLI
│   │   └── smoke-test.js           # データ整合性スモークテスト（件数・鮮度・重複・値域）
│   └── test/                       # node:test（admin-api / ebpm-repos 契約テスト）
├── worker/               # Cloudflare Workers（情報収集サーバー）
│   ├── wrangler.toml     # browser / ai / kv バインディング + cron + vars（COLLECTOR_TOKEN は secret）
│   └── src/index.ts      # POST /collect（認証・宛先許可リスト・レート制限）・GET /snapshot・CORS
└── client/               # Vite + React SPA（ルーズリーフ調 LP）
    ├── src/
    │   ├── App.tsx                 # タブナビ（ホーム/デモ/EBPMカタログ/導入する/データ品質・仕組み）＋ARIA Tabs・URLハッシュ同期
    │   ├── hash.ts                 # タブ / フィルタ状態の URL 同期
    │   ├── download.ts             # CSV / JSON エクスポート（テスト済み）
    │   ├── repoStats.ts            # グラフ集計（純関数・テスト済み）
    │   ├── api.ts                  # API 取得 + 静的フォールバック
    │   └── components/
    │   ├── Home.tsx            # ホーム（ヒーロー + 3CTA + データ状態ストリップ + 公開/ローカル比較表）
    │   ├── CapabilityBadge.tsx # 環境バッジ（デモ / ローカル / 運用者 / 公開停止）
    │   ├── DataStatusStrip.tsx # データ状態ストリップ（取得日・件数・鮮度）
    │   ├── Quality.tsx         # データ品質・仕組み（出典・更新・再現・設計思想）
    │   ├── Usage.tsx           # 導入する（3ステップ）
    │   ├── Catalog.tsx         # EBPMカタログ（探索 / 概観の2セグメント）
    │   ├── RepoModal.tsx       # リポジトリ詳細モーダル
    │   ├── PopulationView.tsx / PopulationChart.tsx
    │   ├── ReposChart.tsx
    │   ├── FreshnessBadge.tsx  # データ鮮度バッジ
    │   └── CollectorControls.tsx   # コレクタ実行 WEB-UI
    │   └── test/setup.ts           # jsdom 互換（localStorage ポリフィル）
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
3. **継続的スモークテスト**: `npm run smoke`（`server/scripts/smoke-test.js`）が保存済みデータの
   整合性を検証。件数・カテゴリ・重複・値域・鮮度（90日）を CI 上でも毎回実行
4. **契約テスト**: `ebpm-repos` のパーサは fixture を元に `server/test/ebpm-repos.test.js` で
   見出しと表の対応・列見出し特定を検証。収集元の構造変化を早期に検知

## 考察（LP 冒頭 →「データ品質・仕組み」タブ）

LP の「データ品質・仕組み」タブでは、EBPM ツールのあるべき姿を設計思想として論じている。

1. データへのアクセスを開く
2. 分析手法を民主化する
3. 再現性と透明性をコードで保証する
4. エビデンスを追い続ける
5. たゆまぬスモークテスト（正確性至上主義）
6. **提唱: 継続運用できる内製能力を残す** — データと分析手順が組織に残り、変化に追随して更新できる状態を目指す。外部リソースも活用しつつ、検証と再現の手順を組織内に残すことを設計原則とする（第三者委託の完全否定ではなく、内製能力を残すための原則として再表現）

## WEB-UI（実用コンソール）

クライアント完結で実装（GitHub Pages でも動作）。

- **5タブ構成**: ホーム（ヒーロー + 3CTA + データ状態ストリップ + 公開/ローカル比較表）・デモ（人口）・
  EBPMカタログ（探索/概観）・導入する（3ステップ）・データ品質・仕組み（出典・鮮度・再現・設計思想）
- **環境バッジ**（`CapabilityBadge.tsx`）: 機能の実行場所を「このページで試せます / ローカルで実行 /
  運用者向け / 実験機能・公開停止中」で明示し、実行できないボタンを置かない
- **データ状態ストリップ**（`DataStatusStrip.tsx`）: 人口・OSS のデータ種別・対象期間・取得日をホームに集約表示
- **カタログ検索 / ソート**（★・名前・言語・更新）
- **CSV / JSON エクスポート**（BOM 付き CSV、Excel 対応）
- **リポジトリ詳細モーダル**（ESC / オーバーレイで閉じる）
- **お気に入り**（localStorage `ebpm-favorites` + 「お気に入りのみ」絞り込み）
- **日本の人口**: 年範囲選択・年別テーブル・CSV 出力
- **URL ハッシュ同期**: `#catalog?view=overview&q=...&sort=...` で状態を共有・復元
- **データ鮮度バッジ**（`FreshnessBadge.tsx`）: `collectedAt` から「データ更新: YYYY-MM-DD」を表示。7日以上経過で「古い可能性があります」と警告（静的フォールバックにも `collectedAt` を同梱し、Pages でも動作）
- **コレクタ実行 WEB-UI**（`CollectorControls.tsx`）: 「導入する」タブ Step 3 でコレクタ一覧（cron / 最終更新 / ステイル警告）と「実行」ボタンを表示。実行結果をインライン表示（成功 / スキップ / 失敗）。サーバ起動時のみ有効で、Pages では「サーバ起動時のみ利用できます」に劣化表示
- **情報収集 UI は公開停止**（SEC-01 対応）: 任意URLの情報収集（Kitesurf）は、認証・利用量制限・宛先制御などの安全対策が完了するまで公開 LP に UI を置かない。方針は「データ品質・仕組み」タブに明記

## Cloudflare Kitesurf 連携（v0.3.0）

GitHub Pages（LP・クライアント）+ Cloudflare Workers（情報収集サーバー）の構成。

| 層 | 実装 | 内容 |
|---|---|---|
| LP（クライアント） | `client/src/kitesurf.ts` / `KitesurfConsole.tsx` | Worker へ指示 → 結果表示 |
| Cloudflare Worker | `worker/src/index.ts` | `POST /collect`（LLM 指示は Workers AI で解析）・`GET /snapshot`（Cron + KV）・CORS |
| Browser Run（Kitesurf） | `browser=kitesurf` Quick Action | `markdown` / `content` / `screenshot` / `pdf` / `links` |
| サーバー側コレクタ（任意） | `server/collectors/kitesurf-snapshot` | REST + `.env` の `CF_ACCOUNT_ID` / `CF_TOKEN` で有効化 |

### secret の管理

- サーバー: `.env`（gitignore 済み）に `CF_ACCOUNT_ID` / `CF_TOKEN`（権限: Browser Rendering - Edit）
- Worker: バインディング使用のため API トークン不要。機密値は `wrangler secret put`、`[vars]` は非機密設定のみ
- GitHub Pages ビルド: `VITE_KITESURF_WORKER_URL` を GitHub Actions **secret** から注入（`.github/workflows/pages.yml`）

### 前提（Cloudflare 側セットアップ）

1. `wrangler kv namespace create SNAPSHOTS` → id を `worker/wrangler.toml` に記入
2. Workers AI 有効化（`[ai]` binding、モデルは `AI_MODEL` で差し替え可）
3. `npm run worker:deploy` → workers.dev URL を GitHub secret `VITE_KITESURF_WORKER_URL` に設定

詳細は README の「Cloudflare Kitesurf 連携」を参照。

## API

| エンドポイント | 内容 |
|----------------|------|
| `GET /api/population` | 日本の総人口（labels/data/source/unit/isLive/collectedAt） |
| `GET /api/repos` | EBPM リポジトリカタログ（categories/repos/isLive/sourceUrl/collectedAt） |
| `GET /api/collectors` | 登録コレクタ一覧（id/name/cron/collectedAt/stale） |
| `POST /api/collect/:id` | コレクタを実行（ok / skipped / error を JSON で返却） |

### Cloudflare Worker のエンドポイント

| エンドポイント | 内容 |
|---|---|
| `POST /collect` | Kitesurf で情報収集（`{ url, action }` または `{ instruction }`、CORS 対応） |
| `GET /snapshot` | Cron + KV で保存した最新スナップショット |
| `GET /health` | 稼働確認（kitesurf / ai / snapshot の有無） |

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
| `CF_ACCOUNT_ID` | Cloudflare アカウント ID（Kitesurf コレクタ用） |
| `CF_TOKEN` | Cloudflare API トークン（権限: Browser Rendering - Edit） |
| `COLLECTOR_DISABLED` | `1` で自動収集・スケジューラを無効化 |
| `COLLECTOR_ADMIN_TOKEN` | 管理 API（`/api/collectors`・`/api/collect/:id`）のリモート認証トークン。未設定なら管理 API はループバックのみ許可（fail closed） |
| `TRUST_PROXY` | `1` で `X-Forwarded-For` を信頼（リバースプロキシ配下の IP 判定用） |

クライアントビルド時:

| 変数 | 説明 |
|------|------|
| `VITE_KITESURF_WORKER_URL` | Cloudflare Worker の URL（サーバー側コレクタ運用用。公開 LP の情報収集 UI は公開停止中） |

## セキュリティ対策（SEC-01 / SEC-02 対応）

監査で指摘された「認証・レート制限・宛先制御の欠如」を fail closed で解消した。

### Worker（任意URL収集）

- `COLLECTOR_TOKEN`（`wrangler secret put` で設定）が無い限り `POST /collect` は **503** で無効化
- トークン不一致は **401**。呼出元 IP ごとに時間あたり上限（`COLLECT_RATE_LIMIT` 既定 30、KV カウンタ + TTL で実装）
- 宛先は `ALLOWED_URL_PREFIXES` の許可リストに限定。未設定なら自プロジェクトのみ（fail closed）
- Cron（`scheduled`）は `runAction` を直接呼ぶためトークン不要のまま動作

### Express 管理 API

- `GET /api/collectors` / `POST /api/collect/:id` に `requireAdmin` ミドルウェアを追加
- ループバック（`127.0.0.1` / `::1`）はローカル WEB-UI・Vite プロキシ用に許可
- リモートは `COLLECTOR_ADMIN_TOKEN` が未設定なら **403**、設定時は `x-admin-token` 一致（SHA-256 ダイジェストの `timingSafeEqual` 比較）で **200**、不一致は **401**
- リバースプロキシ配下は `TRUST_PROXY=1` で `X-Forwarded-For` を信頼（`app.set('trust proxy', true)`）
- 閲覧 API（`/api/population`・`/api/repos`）は認証不要のまま

## データ品質の強化（DATA-01 / DATA-02 対応）

### スモークテストの強化（`server/scripts/smoke-test.js`）

「壊れていない」だけでなく「期待どおり」を検証するよう拡張:

- 件数・カテゴリ数の許容レンジ（repos 20〜200 / カテゴリ 5〜20）
- 重複ゼロ（owner/name・categories）、owner/name の文字形式
- stars の値域（0〜1,000,000、null は「未取得」として許容）
- 人口データ: ラベルが4桁の昇順・重複なし、値域（10M〜500M）、unit/source の存在
- **鮮度**: `collectedAt` が 90 日以内（超過で CI 失敗）
- kitesurf スナップショット: 本文 100 文字以上 + 鮮度

### ebpm-repos パーサの DOM 化（DATA-02）

正規表現の「見出しと表のインデックス対応」を廃止し、cheerio で文書構造を辿る方式に変更:

- 番号付き `<h2>` の直後（`nextAll('table').first()`）の表を紐付ける → 表の挿入・見出しの追加に強い
- 列は位置ではなく `thead` の見出し名で特定（リポジトリ / 説明 / Stars / 言語 / ライセンス）
- `parseHtml()` を純関数として export し、fixture（`server/collectors/ebpm-repos/fixtures/source.html`）を元に契約テストを追加（`server/test/ebpm-repos.test.js`）
- テスト実行: `node --test`（`server/test/*.test.js`、11 tests）。ルート `npm test` は client + server を実行

## データ源

- **EBPM リポジトリカタログ**:
  https://pelican-white-paper.pages.dev/ebpm-github-resources
  （8カテゴリ / 38リポジトリ。`ebpm-repos` コレクタが自動収集）
- **人口データ**: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』
- **graph-tutorial スナップショット**: Cloudflare Kitesurf（Browser Run `/markdown`）で収集した README

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
npm run collect:kitesurf   # Kitesurf スナップショットのみ
```

### 開発コマンド

```bash
npm run lint
npm run format
npm test          # Vitest（18 tests）
npm run smoke     # データ整合性スモークテスト
```

## GitHub Actions

- **CI**（`ci.yml`）: push / PR で lint → test → smoke → build
- **Pages**（`pages.yml`）: main push で `client/dist` をデプロイ。
  `client/src/static/` に同梱したフォールバックデータにより API なしでも全機能が動作

## 今後の拡張メモ

- ✅ データ鮮度バッジ（updatedAt / collectedAt の表示と注意喚起）
- ✅ 「データ収集」タブからのコレクタ手動実行 UI（サーバ起動時のみ）
- 都道府県別の人口グラフ（棒グラフ / 地図）
- 男女別人口の折れ線グラフ
- 統計テーマの選択 UI
- コレクタのスキーマバリデーション強化（JSON Schema）
- コレクタのスケジュール設定 UI
- GitHub Actions によるデータ更新コミット
- API 側のテスト追加
- Kitesurf 収集結果の差し替え UI（スナップショットの Web 編集）

## 追録 2026-08-17: v0.3.0 本番デプロイと UI 整備

### Cloudflare Worker を本番デプロイし、実機で検証した

- **デプロイ先**: `https://graph-tutorial-kitesurf.watanabe3ti.workers.dev`
  （`worker/` で `npx wrangler deploy`。wrangler 認証: アカウント `twpoet@nifty.com`）
- **KV**: `wrangler kv namespace create SNAPSHOTS` → id `369ca9b7…` を `wrangler.toml` に記入
- **Cron**: `0 */6 * * *`（6時間ごとに README スナップショットを KV へ保存）
- **動作確認済み**: `GET /health`（kitesurf/ai/snapshot true）・`POST /collect`
  （simple: markdown / links が実データ取得成功、LLM 指示: 「…を Markdown で取得して」→
  `{url, action}` に自動解析）・`GET /snapshot`（KV から実 README を返却）・CORS OPTIONS

### ハマりどころ（次回へのメモ）

- **AI モデル**: `@cf/qwen/qwen2.5-7b-instruct` はこのアカウントに存在しない
  （1101 / 5007 エラー）→ 利用可能な `@cf/meta/llama-3.1-8b-instruct-fp8` に変更
  （`wrangler.toml` の `AI_MODEL`）
- **browser バインディング**: `[[browser]]`（配列）はデプロイエラー。
  正しくは `[browser]`（オブジェクト形式）で `binding = "BROWSER"`
- **CORS**: `Access-Control-Allow-Origin` に許可リストをそのまま返すとブラウザが拒否する。
  リクエストの `Origin` を検証し、許可された場合のみ**その Origin を反映**する方式に修正
  （ワイルドカード以外は単一値でなければならない）
- **ローカル cron 発火**: `wrangler dev --remote` の `/cdn-cgi/local/scheduled` は 404 で
  ローカルから発火不可。定期収集はデプロイ後の Cron 登録に委ねる（KV 書き込みは手動で実証済み）

### secret の設定状況

- GitHub Actions secret `VITE_KITESURF_WORKER_URL` に Worker URL を設定済み
  （Pages ビルド時に LP へ注入。`gh secret set` で実施）
- サーバー側 `CF_ACCOUNT_ID` / `CF_TOKEN` は `.env` に未設定（`collect:kitesurf` は未検証）

### LP / ドキュメントの整備

- **WEB タイトル**: 「graph-tutorial - 日本の総人口」→「graph-tutorial - 可視化ツール」
- **情報収集タブ**: URL 入力欄を可変幅（`flex: 1 1 360px`）に拡大
- **チュートリアル内蔵**: 情報収集（アクション一覧表 / LLM 例文 / 注意点）・
  データ収集（実行 UI の使い方）・使い方（LP のタブ + 開発者向け）タブに案内を追加
- **README / README_EN**: 7タブ構成 / worker/ / Kitesurf 連携を反映しブラッシュアップ
- **テスト環境**: Node 25 + jsdom で `localStorage.clear is not a function` が発生するため、
  `client/src/test/setup.ts` に localStorage ポリフィルを追加（18 tests）

## 追録 2026-08-20: 監査指摘（SEC / DATA）への対処

外部監査で指摘されたリスクのうち、以下の即時〜短期項目に対処した。

### SEC-01（任意URL収集 Worker）

- `POST /collect` を認証必須化（`COLLECTOR_TOKEN` secret、未設定は 503 = fail closed、不一致 401）
- 宛先許可リスト `ALLOWED_URL_PREFIXES`（未設定なら自プロジェクトのみ）
- 呼出元 IP 単位の時間あたりレート制限 `COLLECT_RATE_LIMIT`（既定 30、KV カウンタ + TTL 3600）
- `wrangler.toml` に vars を追記。`npx wrangler secret put COLLECTOR_TOKEN` で設定
- 注意: 反映には `npm run worker:deploy` が必要（今回は未デプロイ）

### SEC-02（コレクタ起動 API）

- `GET /api/collectors` / `POST /api/collect/:id` に `requireAdmin` を追加
- ループバック許可 + `COLLECTOR_ADMIN_TOKEN` によるリモート認証（`timingSafeEqual` 比較）
- `server/test/admin-api.test.js` で 4 シナリオを検証（ループバック 200 / トークン無し 403 /
  トークン一致 200 / 不一致 401）。閲覧 API は認証不要のまま

### DATA-01（スモークテスト強化）

- 件数・カテゴリ数のレンジ、重複ゼロ、owner/name 形式、stars 値域、人口の年・値域、
  鮮度 90 日以内を検証するよう `smoke-test.js` を拡張

### DATA-02（HTML パーサの DOM 化）

- `ebpm-repos` を cheerio ベースに書き換え（番号付き h2 → 直後の table、列見出し名で列特定）
- `parseHtml()` を export し、fixture + 契約テスト（`server/test/ebpm-repos.test.js`、6 tests）を追加
- サーバーテスト導入: `npm run test -w server`（node --test）。ルート `npm test` が client + server を実行

### 残タスク（未着手）

- Worker の DNS 解決後の非グローバル IP / メタデータ IP 遮断、LLM モードの同意 UI
- 失敗通知（GitHub Issue / メール）、コレクタの JSON Schema バリデーション
- 管理画面 / 監査ログ、E2E / a11y テストの CI 常設

## 追録 2026-08-21: 監査の残タスク対処（SSRF / 同意 / 通知 / スキーマ / 監査 / a11y）

SEC-01 の残タスクと中期監査項目を実装した。

### SSRF 対策（worker/src/url-security.ts）

- ホスト名 / IP リテラル検査でプライベート・ループバック・リンクローカル・メタデータ（169.254.169.254 等）・
  ULA・特殊用途 IPv4（RFC1918 / CGNAT / TEST-NET / マルチキャスト / 予約）を遮断
- `localhost`・`.local`・`.internal`・`.localhost` 等の内部ホスト名も拒否
- IPv6 は `::1` / `fc00::/7` / `fe80::/10` / `::ffff:`（IPv4 マッピング）を検査
- `REDIRECT_CHECK=1`（既定オフ）でリダイレクト先も許可リスト・安全性を検証（DNS rebinding 対策）
- 検査は純関数化し、vitest で単体テスト（`worker/src/url-security.test.ts`、7 tests）を追加。
  CI の `npm run test -w worker` で毎回実行

### LLM モードの同意（worker/src/index.ts）

- `instruction`（LLM 指示）利用時は `consent: true` が必須（無ければ 400）。
  Workers AI へ指示文と URL が送信される旨と、機密情報を送らない注意をエラー文で明示

### コレクタの JSON Schema バリデーション

- `server/lib/collector-registry.js` に ajv を導入。コレクタ定義の `schema` があれば構造検証（未定義なら従来の `validate()`）
- `ebpm-repos`（repos minItems 1 / カテゴリ minItems 5 / owner・name の形式 / stars の値域）と
  `estat-population`（ラベル 4 桁年 / 値域 10M〜500M）に schema を定義
- 契約テストを追加（`server/test/registry.test.js`）: スキーマ違反は失敗扱い / 適合データは保存 / 監査ログ記録 / 通知とクールダウン

### 失敗通知（server/lib/notify.js）

- `FAILURE_WEBHOOK_URL` に失敗情報（コレクタ名 / エラー / 既存データ有無）を POST（Slack 等の汎用ウェブフック）
- 同一コレクタは `FAILURE_NOTIFY_INTERVAL_MINUTES`（既定 360 分）間クールダウンし、障害継続時の通知量を抑制
- 未設定なら何もしない（後方互換）

### 監査ログ（server/lib/audit.js + GET /api/audit）

- 全コレクタ実行（成功 / 失敗 / スキップ）を `server/data/audit.jsonl`（gitignore 済み）に記録
  - 項目: ts / collector / source（cli / startup / scheduler / api）/ status / error / keptExisting / durationMs
- `GET /api/audit`（`requireAdmin` 保護）で直近 50 件（`?limit=` で 500 まで）を取得
- WEB-UI（`CollectorControls.tsx`）に「実行履歴（監査ログ）」を表示。実行後は自動リロード
- 監査ログ・通知状態ファイルを `.gitignore` に追加

### E2E / a11y テストの CI 常設

- `eslint-plugin-jsx-a11y` を導入し lint で CI 常設の a11y 検査を開始
- 指摘を修正: RepoModal を再構成（背景クリックを `role="button"` の overlay ボタン化、ダイアログは sibling 化）し、
  キーボード操作を保証。スクロール可能な監査ログ領域は WAI-ARIA 推奨どおり tabIndex でフォーカス可能に
- CI（`ci.yml`）に worker テスト（vitest）と worker 型チェックを追加

### 検証結果

- `npm run lint` / `npm test`（client 20 + server 17）/ `npm run test -w worker`（7）/ `npm run typecheck -w worker` /
  `npm run build` / `npm run smoke` すべて成功

### デプロイ状況（2026-08-21）

- `npm run worker:deploy` で本番デプロイ済み。Version ID: `e5fb83d3-fc41-4034-9f1d-a4314e968dd1`
- `npx wrangler secret put COLLECTOR_TOKEN` で secret を設定済み（トークン値はコミットしない。
  運用側のシークレット管理に保存し、必要に応じてローテーションすること）
- 実機検証: 正常系 markdown 200 / SSRF 遮断（169.254.169.254）403 / 許可リスト外 403 /
  LLM 同意なし 400 / トークンなし 401 / snapshot 200 を確認
- 注意: `waitUntil` の指定値は Browser Run の仕様に従う（`commit` 等の不正値は 502 になる）

### 監査ログ / 通知の運用注意

- 監査ログ・通知状態は `server/data/` に書き出されるため、コンテナ/サーバの永続領域を確保すること

## 追録 2026-08-21: v0.4.0 リリース

監査指摘（SEC / DATA）の全項目への対処と残タスク実装を完了し、v0.4.0 としてリリース。

- バージョン: 全ワークスペース（root / client / server / worker）と `package-lock.json`、README / README_EN の
  バッジ、DEV-MEMO のバージョン表記を v0.4.0 に更新
- 内容: SEC-01（Worker 認証・レート制限・宛先制御・SSRF 遮断・LLM 同意）・SEC-02（管理 API 認可）・
  DATA-01（スモークテスト強化）・DATA-02（DOM パーサ化＋契約テスト）・JSON Schema バリデーション・
  失敗通知・監査ログ・a11y lint 常設・Worker 本番デプロイ
- テスト: client 20 / server 17 / worker 7、lint・build・smoke・worker typecheck すべて成功