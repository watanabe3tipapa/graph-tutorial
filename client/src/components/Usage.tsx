function Usage() {
  return (
    <section className="leaf-content">
      <h1>使い方</h1>

      <h2>LP のタブ</h2>
      <table className="env-table">
        <thead>
          <tr>
            <th>タブ</th>
            <th>内容</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>考察</td>
            <td>人口減少の背景と EBPM（証拠に基づく政策立案）の考察</td>
          </tr>
          <tr>
            <td>よくあるやつ</td>
            <td>日本の総人口グラフ。ドラッグで期間を選択可能</td>
          </tr>
          <tr>
            <td>EBPMリポジトリ</td>
            <td>EBPM 関連 GitHub リポジトリの一覧（スター数・更新日）</td>
          </tr>
          <tr>
            <td>カタログ</td>
            <td>収集したデータのカタログ（検索・絞り込み可能）</td>
          </tr>
          <tr>
            <td>データ収集</td>
            <td>自律コレクタの実行 UI とその仕組み</td>
          </tr>
          <tr>
            <td>情報収集</td>
            <td>任意の URL を Markdown / PDF などに変換して取得</td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        「データ収集」の実行 UI はサーバー起動時のみ利用できます。GitHub Pages（この公開ページ）では
        閲覧専用です。
      </p>

      <h2>開発者向け</h2>
      <h3>クイックスタート</h3>
      <pre>{`npm install
npm run dev          # 開発: http://localhost:5173
npm run build && npm start   # 本番: http://localhost:3000`}</pre>

      <h3>環境変数</h3>
      <table className="env-table">
        <thead>
          <tr>
            <th>変数</th>
            <th>説明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ESTAT_APP_ID</code></td>
            <td>
              e-Stat 統計データ API のアプリケーションID。
              設定すると人口データを最新値で取得。
            </td>
          </tr>
          <tr>
            <td><code>GITHUB_TOKEN</code></td>
            <td>
              GitHub API トークン。設定するとリポジトリの
              スター数・更新日を最新値で取得。
            </td>
          </tr>
          <tr>
            <td><code>COLLECTOR_DISABLED</code></td>
            <td><code>1</code> で起動時の自動収集とスケジューラを無効化。</td>
          </tr>
        </tbody>
      </table>

      <p className="note">
        設定方法: <code>cp .env.example .env</code> の後、<code>.env</code> に値を記入して再起動。
      </p>

      <h3>開発コマンド</h3>
      <pre>{`npm run lint       # ESLint
npm run format     # Prettier
npm test           # Vitest`}</pre>

      <h3>データ源</h3>
      <ul>
        <li>
          EBPM リポジトリカタログ（「カタログ」タブに全 38 件を表示）:
          <a
            href="https://pelican-white-paper.pages.dev/ebpm-github-resources"
            target="_blank"
            rel="noreferrer"
          >
            元データ: EBPM 関連 GitHub リソース一覧
          </a>
        </li>
        <li>人口データ: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』</li>
      </ul>
    </section>
  )
}

export default Usage