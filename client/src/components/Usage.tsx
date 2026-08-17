function Usage() {
  return (
    <section className="leaf-content">
      <h1>使い方</h1>

      <h2>クイックスタート</h2>
      <pre>{`npm install
npm run dev          # 開発: http://localhost:5173
npm run build && npm start   # 本番: http://localhost:3000`}</pre>

      <h2>環境変数</h2>
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

      <h2>開発コマンド</h2>
      <pre>{`npm run lint       # ESLint
npm run format     # Prettier
npm test           # Vitest`}</pre>

      <h2>データ源</h2>
      <ul>
        <li>
          EBPM リポジトリカタログ:
          <a
            href="https://pelican-white-paper.pages.dev/ebpm-github-resources"
            target="_blank"
            rel="noreferrer"
          >
            EBPM 関連 GitHub リソース一覧
          </a>
        </li>
        <li>人口データ: 政府統計総合窓口（e-Stat）／総務省統計局『人口推計』</li>
      </ul>
    </section>
  )
}

export default Usage