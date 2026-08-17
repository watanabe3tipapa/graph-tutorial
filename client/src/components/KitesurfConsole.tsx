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
      <p className="note">
        情報収集（Cloudflare Kitesurf）は <code>VITE_KITESURF_WORKER_URL</code> が設定されている
        場合に利用できます。Worker をデプロイしてビルド時に指定してください。
      </p>
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
    <div>
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
    </div>
  )
}

export default KitesurfConsole