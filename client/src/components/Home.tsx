import type { Tab } from '../App'
import CapabilityBadge from './CapabilityBadge'
import DataStatusStrip from './DataStatusStrip'

interface Props {
  onNavigate: (tab: Tab) => void
}

function Home({ onNavigate }: Props) {
  return (
    <section className="leaf-content">
      <div className="demo-banner">
        <CapabilityBadge kind="demo" />
        <p>
          閲覧・検索・CSV/JSON出力をブラウザですぐ試せます。データの収集・更新はローカル版で実行します。
        </p>
        <button className="source-link" onClick={() => onNavigate('quality')}>
          公開デモとローカル版の違い
        </button>
      </div>

      <h1>EBPMのためのデータ探索・可視化スターター</h1>
      <p>
        日本の人口推移とEBPM関連OSSを、出典と更新日を確認しながら探索できます。
        自組織の環境で継続更新するための実装も公開しています。
      </p>

      <div className="home-ctas">
        <button className="export-btn home-cta" onClick={() => onNavigate('population')}>
          人口推移をみる
        </button>
        <button className="export-btn home-cta" onClick={() => onNavigate('catalog')}>
          EBPM OSSを探す
        </button>
        <button className="export-btn home-cta" onClick={() => onNavigate('usage')}>
          ローカルで動かす
        </button>
      </div>

      <DataStatusStrip onNavigate={onNavigate} />

      <h2>このページでできること</h2>
      <div className="cards">
        <div className="card capability-card">
          <CapabilityBadge kind="demo" />
          <h3>人口推移を確認する</h3>
          <p>年代を絞り、グラフと表をCSVで出力できます。</p>
          <button className="source-link" onClick={() => onNavigate('population')}>
            人口デモへ →
          </button>
        </div>
        <div className="card capability-card">
          <CapabilityBadge kind="demo" />
          <h3>EBPM OSSを探す</h3>
          <p>カテゴリ・言語・スター数で比較し、一覧を出力できます。</p>
          <button className="source-link" onClick={() => onNavigate('catalog')}>
            カタログへ →
          </button>
        </div>
        <div className="card capability-card">
          <CapabilityBadge kind="local" />
          <h3>自分の環境で更新する</h3>
          <p>e-StatやGitHub APIをつなぎ、データ取得を自動化できます。</p>
          <button className="source-link" onClick={() => onNavigate('usage')}>
            導入手順へ →
          </button>
        </div>
      </div>

      <h2>公開デモとローカル版の違い</h2>
      <table className="env-table">
        <thead>
          <tr>
            <th>できること</th>
            <th>公開デモ</th>
            <th>ローカル版</th>
            <th>利用者の次の行動</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>人口推移の閲覧・期間絞り込み</td>
            <td><strong>利用可能</strong></td>
            <td><strong>利用可能</strong></td>
            <td>まず公開デモで試す</td>
          </tr>
          <tr>
            <td>EBPMカタログの検索・出力</td>
            <td><strong>利用可能</strong></td>
            <td><strong>利用可能</strong></td>
            <td>まず公開デモで試す</td>
          </tr>
          <tr>
            <td>e-Stat/GitHubからの最新化</td>
            <td>利用不可</td>
            <td><strong>利用可能</strong></td>
            <td>最新データを使う</td>
          </tr>
          <tr>
            <td>定期収集・失敗監視</td>
            <td>利用不可</td>
            <td><strong>利用可能</strong></td>
            <td>運用を設定する</td>
          </tr>
          <tr>
            <td>収集ジョブの手動実行</td>
            <td>利用不可</td>
            <td>管理者のみ</td>
            <td>管理者向け手順を見る</td>
          </tr>
          <tr>
            <td>任意URLの情報収集</td>
            <td>公開停止中</td>
            <td>安全設計後に限定提供</td>
            <td>設計方針を見る</td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        公開デモは、機能を安全に試し、データの見え方を確認するためのものです。
        収集・更新・スケジューリングは、資格情報を管理できるご自身の環境で実行してください。
      </p>
    </section>
  )
}

export default Home
