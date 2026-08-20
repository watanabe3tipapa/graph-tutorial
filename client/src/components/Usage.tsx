import CapabilityBadge from './CapabilityBadge'
import CollectorControls from './CollectorControls'

function Usage() {
  return (
    <section className="leaf-content">
      <h1>導入する</h1>
      <p>
        このリポジトリを取得して、ローカル環境で起動するための手順です。
        最初の起動はAPIキー不要で5分程度で完了します。
      </p>

      <div className="step-list">
        <div className="step">
          <div className="step-head">
            <span className="step-no">Step 1</span>
            <h2>まずはサンプルを表示する</h2>
            <CapabilityBadge kind="local" />
          </div>
          <p className="step-note">APIキー不要 / 5分 / 公開デモと同じ画面がローカルで表示される</p>
          <pre>{`git clone https://github.com/watanabe3tipapa/graph-tutorial
cd graph-tutorial
npm install
npm run dev          # 開発: http://localhost:5173`}</pre>
          <p>
            本番と同じ動作を確認したい場合は <code>npm run build && npm start</code> で
            http://localhost:3000 を開きます。
          </p>
        </div>

        <div className="step">
          <div className="step-head">
            <span className="step-no">Step 2</span>
            <h2>必要なデータだけ最新化する</h2>
            <CapabilityBadge kind="local" />
          </div>
          <p className="step-note">
            任意の追加設定です。e-Stat / GitHub の資格情報を持っている場合だけ設定してください。
          </p>
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
          <pre>{`cp .env.example .env      # 必要なら編集
npm run collect          # 全コレクタを実行
npm run collect:repos    # EBPM リポジトリのみ
npm run collect:population  # 人口データのみ`}</pre>
          <p className="note">
            設定方法: <code>.env</code> に値を記入して再起動。取得日時が更新され、結果を確認できます。
          </p>
        </div>

        <div className="step">
          <div className="step-head">
            <span className="step-no">Step 3</span>
            <h2>継続運用を設定する</h2>
            <CapabilityBadge kind="admin" />
          </div>
          <p className="step-note">管理者のみ。収集頻度・鮮度・障害対応を設定します。</p>
          <ul>
            <li>
              <strong>定期収集</strong>: 各コレクタの <code>cron</code> 時刻に自動実行（例: 毎日3時）
            </li>
            <li>
              <strong>鮮度判定</strong>: <code>staleAfterMs</code> を超えると「古いデータ」として警告
            </li>
            <li>
              <strong>劣化処理</strong>: 取得失敗時は既存データを保持し、空で上書きしない
            </li>
            <li>
              <strong>失敗検知</strong>: <code>npm run smoke</code> でデータ整合性を CI 上でも継続検証
            </li>
          </ul>
          <h3>コレクタ実行（WEB-UI）</h3>
          <p>
            サーバー起動時にのみ利用できます。「実行」ボタンで保存済みデータを最新化し、
            成功すると「更新」日時が変わります。GitHub Pages（この公開ページ）では API がないため利用できません。
          </p>
          <CollectorControls />
        </div>
      </div>

      <h2>開発コマンド</h2>
      <pre>{`npm run lint       # ESLint
npm run format     # Prettier
npm test           # Vitest
npm run smoke      # データ整合性スモークテスト`}</pre>
    </section>
  )
}

export default Usage