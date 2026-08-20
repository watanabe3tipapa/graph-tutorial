import { useCallback, useEffect, useState } from 'react'
import type { AuditEntry, CollectorInfo } from '../types'

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

function formatTime(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 19).replace('T', ' ')
}

function CollectorControls() {
  const [collectors, setCollectors] = useState<CollectorInfo[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [audit, setAudit] = useState<AuditEntry[] | null>(null)
  const [auditUnavailable, setAuditUnavailable] = useState(false)

  const load = useCallback(() => {
    fetch('/api/collectors', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((list: CollectorInfo[]) => setCollectors(list))
      .catch(() => setUnavailable(true))
  }, [])

  const loadAudit = useCallback(() => {
    fetch('/api/audit?limit=10', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((data: { entries: AuditEntry[] }) => setAudit(data.entries))
      .catch(() => setAuditUnavailable(true))
  }, [])

  useEffect(() => {
    load()
    loadAudit()
  }, [load, loadAudit])

  const run = (c: CollectorInfo) => {
    setRunning(c.id)
    setResults((prev) => ({ ...prev, [c.id]: { id: c.id, status: 'running' } }))
    fetch(`/api/collect/${c.id}`, { method: 'POST', cache: 'no-store' })
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
        loadAudit()
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
      {auditUnavailable ? null : audit === null ? null : (
        <section className="audit-section" aria-label="収集の実行履歴">
          <h3>実行履歴（監査ログ）</h3>
          {audit.length === 0 ? (
            <p className="note">まだ実行履歴がありません。</p>
          ) : (
            <div className="table-scroll" role="region" aria-label="実行履歴一覧">
              {/* スクロール可能領域はキーボードでフォーカス可能にする（WAI-ARIA 推奨） */}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
              <div tabIndex={0}>
                <table className="audit-table">
                <thead>
                  <tr>
                    <th scope="col">日時</th>
                    <th scope="col">コレクタ</th>
                    <th scope="col">起点</th>
                    <th scope="col">結果</th>
                    <th scope="col">所要時間</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a, i) => (
                    <tr key={a.ts + ':' + i}>
                      <td>{formatTime(a.ts)}</td>
                      <td>
                        <code>{a.collector}</code>
                      </td>
                      <td>{a.source}</td>
                      <td>
                        <span className={'collector-result ' + a.status}>
                          {a.status}
                          {a.status === 'error' ? `: ${a.error ?? ''}` : ''}
                        </span>
                      </td>
                      <td>{a.durationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default CollectorControls