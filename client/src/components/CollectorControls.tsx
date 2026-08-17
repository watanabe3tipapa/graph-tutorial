import { useCallback, useEffect, useState } from 'react'
import type { CollectorInfo } from '../types'

interface RunResult {
  id: string
  status: string
  collectedAt?: string
  reason?: string
  error?: string
  message?: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10)
}

function CollectorControls() {
  const [collectors, setCollectors] = useState<CollectorInfo[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunResult>>({})

  const load = useCallback(() => {
    fetch('/api/collectors')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((list: CollectorInfo[]) => setCollectors(list))
      .catch(() => setUnavailable(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const run = (c: CollectorInfo) => {
    setRunning(c.id)
    setResults((prev) => ({ ...prev, [c.id]: { id: c.id, status: 'running' } }))
    fetch(`/api/collect/${c.id}`, { method: 'POST' })
      .then(async (res) => {
        const data = (await res.json()) as RunResult
        if (!res.ok) {
          throw new Error(data.message ?? 'HTTP ' + res.status)
        }
        return data
      })
      .then((data) => {
        setResults((prev) => ({ ...prev, [c.id]: data }))
        load()
      })
      .catch((e: unknown) => {
        setResults((prev) => ({
          ...prev,
          [c.id]: { id: c.id, status: 'error', error: e instanceof Error ? e.message : '実行失敗' },
        }))
      })
      .finally(() => setRunning(null))
  }

  if (unavailable) {
    return (
      <p className="note">
        コレクタ実行 UI はサーバ起動時のみ利用できます（
        <code>npm run build &amp;&amp; npm start</code> で localhost:3000 に接続）。
        GitHub Pages では API が無いため利用できません。
      </p>
    )
  }
  if (!collectors) {
    return <p>読み込み中...</p>
  }

  return (
    <div className="collector-list">
      {collectors.map((c) => {
        const result = results[c.id]
        return (
          <div key={c.id} className="collector-row">
            <div className="collector-info">
              <strong>{c.name}</strong>
              <span className="collector-meta">
                <code>{c.id}</code> / cron: {c.cron ?? '-'} / 更新: {formatDate(c.collectedAt)}
              </span>
              {c.stale ? (
                <span className="freshness-badge stale">古いデータ</span>
              ) : null}
              {result ? (
                <span className={'collector-result ' + result.status}>
                  {result.status === 'ok'
                    ? `成功（${formatDate(result.collectedAt ?? null)}）`
                    : result.status === 'running'
                      ? '実行中...'
                      : result.status === 'skipped'
                        ? `スキップ（${result.reason ?? ''}）`
                        : `失敗: ${result.error ?? ''}`}
                </span>
              ) : null}
            </div>
            <button
              className="export-btn"
              onClick={() => run(c)}
              disabled={running !== null}
            >
              {running === c.id ? '実行中...' : '実行'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default CollectorControls