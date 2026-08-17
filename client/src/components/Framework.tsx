function Framework() {
  return (
    <section className="leaf-content">
      <h1>データ収集フレームワーク（自律コレクタ）</h1>
      <p>
        各データ源は <code>server/collectors/</code> に自己完結型コレクタとして実装され、
        次の4層の自律性を持ってデータを更新する。
      </p>

      <ul>
        <li>
          <strong>スケジュール</strong>: node-cron による定期実行（例: 毎日3時）
        </li>
        <li>
          <strong>起動時スタル検知</strong>: データが古ければサーバ起動時に自動更新
        </li>
        <li>
          <strong>劣化処理</strong>: 取得失敗時は既存データを保持し、止まらない
        </li>
        <li>
          <strong>CLI 実行</strong>: <code>npm run collect</code> で手動・CI からも実行可能
        </li>
      </ul>

      <h2>アーキテクチャ</h2>
      <pre>{`server/
├── collectors/                 # 1コレクタ = 1自己完結モジュール
│   ├── ebpm-repos/
│   │   └── collector.js        # URL を取得 → パース → 正規化
│   └── estat-population/
│       └── collector.js        # e-Stat API（appId があれば live）
├── data/                       # 各コレクタの出力（collectedAt 付き）
├── lib/
│   └── collector-registry.js   # 自動発見 + 実行 + cron + スタル検知
└── scripts/
    └── run-collectors.js       # CLI: 全実行 / 個別実行`}</pre>

      <h2>コレクタの共通インターフェース</h2>
      <pre>{`module.exports = {
  id: 'ebpm-repos',
  name: 'EBPM 関連 GitHub リソース',
  cron: '0 3 * * *',        // 自律実行時刻
  async collect() { ... },  // 取得 + 正規化して返す
  validate(data) { ... },   // スキーマ検証（任意）
}`}</pre>

      <h2>実行コマンド</h2>
      <pre>{`npm run collect            # 全コレクタを実行
npm run collect:list       # 登録コレクタ一覧
npm run collect:repos      # EBPM リポジトリのみ
npm run collect:population # 人口データのみ`}</pre>
    </section>
  )
}

export default Framework