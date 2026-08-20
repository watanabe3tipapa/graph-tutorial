import CapabilityBadge from './CapabilityBadge'

function Quality() {
  return (
    <section className="leaf-content">
      <h1>データ品質・仕組み</h1>
      <p>
        このLPのデータの出典、更新の仕組み、再現方法、そして設計思想をまとめています。
      </p>

      <h2>データの出典</h2>
      <table className="env-table">
        <thead>
          <tr>
            <th>データ</th>
            <th>出典</th>
            <th>公開デモでの扱い</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>日本の総人口</td>
            <td>政府統計総合窓口（e-Stat）／総務省統計局『人口推計』</td>
            <td>固定スナップショット（2010–2023）</td>
          </tr>
          <tr>
            <td>EBPM関連OSSカタログ</td>
            <td>
              <a
                href="https://pelican-white-paper.pages.dev/ebpm-github-resources"
                target="_blank"
                rel="noreferrer"
              >
                EBPM 関連 GitHub リソース一覧
              </a>
            </td>
            <td>固定カタログ（8カテゴリ / 38件）</td>
          </tr>
          <tr>
            <td>graph-tutorial スナップショット</td>
            <td>Cloudflare Kitesurf（Browser Run /markdown）</td>
            <td>公開停止中</td>
          </tr>
        </tbody>
      </table>

      <h2>更新と鮮度</h2>
      <p>
        公開デモは<strong>固定スナップショット</strong>を表示しています。表示上の「データ更新」日時は
        収集された日付であり、閲覧時点で自動更新されるものではありません。
      </p>
      <p>
        ローカル版（このリポジトリ）では、コレクタが定期的に取得し、取得失敗時は既存データを保持します。
        最終更新から長期間経過すると「古い可能性があります」と表示します。
      </p>

      <h2>再現する方法</h2>
      <p>
        このリポジトリを取得すれば、公開デモと同じ表示をローカルで再現できます。
        データの最新化は任意の追加設定です。
      </p>
      <pre>{`git clone https://github.com/watanabe3tipapa/graph-tutorial
cd graph-tutorial
npm install
npm run dev          # 開発: http://localhost:5173`}</pre>
      <p className="note">
        APIキー不要で起動できます。最新データが必要になったら「導入する」タブのStep 2以降を設定してください。
      </p>

      <h3>自律コレクタのアーキテクチャ</h3>
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
      <pre>{`npm run collect            # 全コレクタを実行
npm run collect:list       # 登録コレクタ一覧
npm run collect:repos      # EBPM リポジトリのみ
npm run collect:population # 人口データのみ
npm run smoke              # 保存済みデータの整合性を検証（CI でも実行）`}</pre>

      <h2>実験機能・公開停止中</h2>
      <div className="demo-banner">
        <CapabilityBadge kind="disabled" />
        <p>
          任意URLの情報収集（Cloudflare Kitesurf）は、認証・利用量制限・宛先制御などの安全対策が完了するまで
          <strong>公開していません</strong>。公開LPに任意URL入力・実行UIは存在しません。
        </p>
      </div>
      <p>
        この機能は任意のURLをサーバー側のブラウザで実行するため、不特定多数が利用できる状態での公開は
        コスト・SSRF・外部負荷のリスクがあります。設計方針を固め、安全に限定提供できる状態になった後に
        再検討します。
      </p>

      <h2>設計思想</h2>
      <h3>継続運用できる内製能力を残す</h3>
      <p>
        政策評価は、データと分析手順が公開されて初めて信頼を得ます。
        データ収集、可視化、運用の知識が組織に残り、継続的に更新できる状態を目指します。
        外部のリソースも活用できますが、中身を検証でき、変化に追随できる再現手順を組織内に残すことを
        設計原則としています。
      </p>

      <h3>正確性至上主義</h3>
      <p>
        データ・情報収集ツールにとって、一度の正しさは意味を持ちません。収集元は絶えず変化するため、
        ツールは静かに壊れ続けます。だからこそ「取得 → パース → 検証 → 描画」の各段階に
        スモークテストを絶え間なく仕掛け、異常を早期に検知し続けます。本ツールではこれを
        <strong>正確性至上主義</strong> と呼びます。
      </p>
      <ul>
        <li>
          <strong>コレクタの検証</strong>: <code>validate()</code> が取得データのスキーマを確認し、不正なら保存しない
        </li>
        <li>
          <strong>劣化処理</strong>: 取得失敗時は既存データを保持し、空のデータで上書きしない
        </li>
        <li>
          <strong>継続的スモークテスト</strong>: <code>npm run smoke</code> が保存済みデータの整合性を検証。CI 上でも毎回実行
        </li>
      </ul>

      <h3>エビデンスを追い続ける</h3>
      <p>
        政策効果は一度きりの分析で終わりません。制度改正や社会変化に応じてデータを継続的に更新する仕組み
        こそ、EBPMツールの本質的な要件です。このLPはその試作として、カタログ化・可視化・自律収集を
        一つのリポジトリに実装しています。
      </p>
    </section>
  )
}

export default Quality
