import { useState } from 'react'
import type { KitesurfAction, KitesurfResponse } from '../types'
import { kitesurfEnabled, runCollect } from '../kitesurf'

const DEFAULT_URL = 'https://github.com/watanabe3tipapa/graph-tutorial'

const ACTIONS: { id: KitesurfAction; label: string }[] = [
  { id: 'markdown', label: 'Markdown に変換' },
  { id: 'content', label: 'HTML を取得' },
  { id: 'screenshot', label: 'スクリーンショット' },
  { id: 'pdf', label: 'PDF を生成' },
  { id: 'links', label: 'リンク一覧' },
]

type Mode = 'simple' | 'llm'

function ResultView({ response }: { response: KitesurfResponse }) {
  if (!response.success) {
    return <p className="collector-result error">失敗: {response.error ?? ''}</p>
  }
  const result = response.result
  let body = <pre className="kitesurf-pre">{JSON.stringify(result, null, 2)}</pre>
  if (response.action === 'screenshot' && typeof result === 'string') {
    body = (
      <img
        className="kitesurf-screenshot"
        src={`data:image/png;base64,${result}`}
        alt={`${response.url ?? ''} のスクリーンショット`}
      />
    )
  } else if (response.action === 'pdf' && typeof result === 'string') {
    body = (
      <a
        className="export-btn"
        href={`data:application/pdf;base64,${result}`}
        download="kitesurf.pdf"
      >
        PDF をダウンロード
      </a>
    )
  } else if (typeof result === 'string') {
    body = <pre className="kitesurf-pre">{result}</pre>
  }
  return (
    <div>
      {response.title ? <p className="collector-meta">タイトル: {response.title}</p> : null}
      <p className="collector-meta">
        URL: {response.url ?? ''} / アクション: {response.action ?? ''}
        {response.contentType ? ` / type: ${response.contentType}` : ''}
      </p>
      {body}
    </div>
  )
}

function KitesurfConsole() {
  const [mode, setMode] = useState<Mode>('simple')
  const [url, setUrl] = useState(DEFAULT_URL)
  const [action, setAction] = useState<KitesurfAction>('markdown')
  const [instruction, setInstruction] = useState('')
  const [running, setRunning] = useState(false)
  const [response, setResponse] = useState<KitesurfResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!kitesurfEnabled()) {
    return (
      <section className="leaf-content">
        <h1>情報収集（Cloudflare Kitesurf）</h1>
        <p className="note">
          情報収集（Cloudflare Kitesurf）は <code>VITE_KITESURF_WORKER_URL</code> が設定されている
          場合に利用できます。Worker をデプロイしてビルド時に指定してください。
        </p>
      </section>
    )
  }

  const submit = async () => {
    setRunning(true)
    setError(null)
    setResponse(null)
    try {
      const req =
        mode === 'llm'
          ? { instruction }
          : { url: url.trim() || DEFAULT_URL, action }
      const data = await runCollect(req)
      setResponse(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '実行に失敗しました')
    } finally {
      setRunning(false)
    }
  }

  const canSubmit = running || (mode === 'llm' ? instruction.trim() === '' : url.trim() === '')

  return (
    <section className="leaf-content">
      <h1>情報収集（Cloudflare Kitesurf）</h1>
      <p>
        Cloudflare のヘッドレスブラウザ（Kitesurf）で任意の URL を開き、
        ページ内容を <strong>Markdown / HTML / スクリーンショット / PDF / リンク一覧</strong> に
        変換して取得します。
      </p>

      <h2>使い方（シンプルモード）</h2>
      <ol>
        <li>
          「URL」に取得したいページの <code>https://…</code> を入力する
          （未入力ならこのツールのリポジトリを取得）
        </li>
        <li>「アクション」で変換方法を選択する</li>
        <li>「実行」を押して結果を確認する</li>
      </ol>

      <h2>アクションの意味</h2>
      <table className="env-table">
        <thead>
          <tr>
            <th>アクション</th>
            <th>内容</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>markdown</code>
            </td>
            <td>ページ本文を Markdown に変換（文字情報の読み取りに最適）</td>
          </tr>
          <tr>
            <td>
              <code>content</code>
            </td>
            <td>HTML ソースをそのまま取得</td>
          </tr>
          <tr>
            <td>
              <code>screenshot</code>
            </td>
            <td>画面を PNG 画像で取得（処理が重め）</td>
          </tr>
          <tr>
            <td>
              <code>pdf</code>
            </td>
            <td>ページを PDF に変換（処理が重め）</td>
          </tr>
          <tr>
            <td>
              <code>links</code>
            </td>
            <td>ページ内のリンク一覧を抽出</td>
          </tr>
        </tbody>
      </table>

      <h2>LLM 指示モード</h2>
      <p>
        自然言語で指示すると、Worker 側の AI（Workers AI）が URL とアクションを自動で判断します。
        例:
      </p>
      <ul>
        <li>「graph-tutorial の README を Markdown で取得して」</li>
        <li>「総務省統計局のサイトをスクリーンショットして」</li>
        <li>「Wikipedia のリンク一覧を取得して」</li>
      </ul>

      <h2>注意</h2>
      <p className="note">
        実行はブラウザを起動するため 10〜30 秒かかります（初回はさらに遅い場合あり）。ログインが
        必要なページや JavaScript に大きく依存するページは取得できないことがあります。LLM 指示モードは
        指示文を Workers AI（Cloudflare のクラウド）へ送信します。
      </p>

      <div className="kitesurf-mode">
        <button
          className={mode === 'simple' ? 'leaf-tab active' : 'leaf-tab'}
          onClick={() => setMode('simple')}
        >
          シンプル（URL + アクション）
        </button>
        <button
          className={mode === 'llm' ? 'leaf-tab active' : 'leaf-tab'}
          onClick={() => setMode('llm')}
        >
          LLM 指示（自然言語）
        </button>
      </div>

      {mode === 'simple' ? (
        <div className="catalog-controls">
          <div className="filter-block kitesurf-url-block">
            <span>URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_URL}
              className="kitesurf-input kitesurf-url"
            />
          </div>
          <div className="filter-block">
            <span>アクション</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as KitesurfAction)}
              className="kitesurf-input"
            >
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="catalog-controls">
          <div className="filter-block search-box">
            <span>指示文（例: 「graph-tutorial の README を Markdown で取得して」）</span>
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="自然言語で収集内容を指定"
              className="kitesurf-input"
            />
          </div>
        </div>
      )}

      <div className="export-btns">
        <button className="export-btn" onClick={submit} disabled={canSubmit}>
          {running ? '実行中...' : '実行'}
        </button>
      </div>

      {error ? <p className="collector-result error">失敗: {error}</p> : null}
      {response ? <ResultView response={response} /> : null}
    </section>
  )
}

export default KitesurfConsole