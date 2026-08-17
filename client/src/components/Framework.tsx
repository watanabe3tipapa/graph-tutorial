import CollectorControls from './CollectorControls'

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
          <strong>起動時ステイル検知</strong>: データが古ければサーバ起動時に自動更新
        </li>
        <li>
          <strong>劣化処理</strong>: 取得失敗時は既存データを保持し、止まらない
        </li>
        <li>
          <strong>CLI 実行</strong>: <code>npm run collect</code> で手動・CI からも実行可能
        </li>
      </ul>

      <h2>コレクタ実行（WEB-UI）</h2>
      <p>
        「実行」ボタンを押すとサーバー上のコレクタが動き、保存済みデータを最新化します。
        成功すると「更新」日時が変わります。取得に失敗しても既存データは保持され、
        空のデータで上書きされません（劣化処理）。
      </p>
      <CollectorControls />

      <h2>アーキテクチャ</h2>
      <pre>{`server/
├── collectors/                 # 1コレクタ = 1自己完結モジュール
│   ├── ebpm-repos/
│   │   └── collector.js        # URL を取得 → パース → 正規化
│   └── estat-population/
│       └── collector.js        # e-Stat API（appId があれば live）
├── data/                       # 各コレクタの出力（collectedAt 付き）
├── lib/
│   └── collector-registry.js   # 自動発見 + 実行 + cron + ステイル検知
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

      <h2>スモークテスト（正確性至上主義）</h2>
      <p>
        収集元は常に変化するため、ツールは静かに壊れ続ける。
        本フレームワークは正しさを「守り続ける」ため、次の3層で常時検知する。
      </p>
      <ul>
        <li>
          <strong>コレクタの検証</strong>: <code>validate()</code> が取得データのスキーマ
          （owner / name / category など）を確認し、不正なら保存しない
        </li>
        <li>
          <strong>劣化処理</strong>: 取得失敗時は既存データを保持し、空のデータで上書きしない
        </li>
        <li>
          <strong>継続的スモークテスト</strong>: <code>npm run smoke</code> が
          保存済みデータの整合性を検証。CI 上でも毎回実行される
        </li>
      </ul>
      <pre>{`npm run smoke     # 保存済みデータの整合性を検証（CI でも実行）`}</pre>
    </section>
  )
}

export default Framework