import { useCallback, useEffect, useMemo, useState } from 'react'
import ReposChart from './ReposChart'
import FreshnessBadge from './FreshnessBadge'
import { fetchRepos } from '../api'
import { readHashParams, setHash } from '../hash'
import type { ChartType, ReposResponse } from '../types'
import type { Tab } from '../App'

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'category', label: 'カテゴリ別リポジトリ数' },
  { id: 'stars', label: 'スター数トップ10' },
  { id: 'language', label: '言語分布' },
  { id: 'activity', label: '更新年別アクティビティ' },
]

function ReposView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [res, setRes] = useState<ReposResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('category')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    setError(null)
    fetchRepos()
      .then((r) => {
        setRes(r)
        const cats = readHashParams().get('cat')
        setSelected(
          cats ? new Set(cats.split(',').filter(Boolean)) : new Set(r.categories),
        )
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!res) return []
    if (selected.size === 0 || selected.size === res.categories.length) {
      return res.repos
    }
    return res.repos.filter((r) => selected.has(r.category))
  }, [res, selected])

  const toggle = (cat: string) => {
    const next = new Set(selected)
    if (next.has(cat)) {
      next.delete(cat)
    } else {
      next.add(cat)
    }
    setSelected(next)
    setHash('repos', { cat: [...next].join(',') })
  }

  if (error) {
    return <p className="error">エラー: {error}</p>
  }
  if (!res) {
    return <p>読み込み中...</p>
  }

  return (
    <section>
      <h1>EBPM 関連 GitHub リソース分析</h1>
      <p className="badge">
        {res.isLive
          ? 'GitHub API の最新値を表示中'
          : '静的カタログを表示中（GITHUB_TOKEN を設定すると最新値を取得）'}
      </p>
      <FreshnessBadge collectedAt={res.collectedAt} />

      <div className="filters">
        <div className="filter-block">
          <h3>グラフ種類</h3>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
          >
            {CHART_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-block">
          <h3>カテゴリ（{filtered.length}件）</h3>
          <div className="checkbox-group">
            {res.categories.map((cat) => (
              <label key={cat} className="checkbox">
                <input
                  type="checkbox"
                  checked={selected.has(cat)}
                  onChange={() => toggle(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>
      </div>

      <ReposChart repos={filtered} type={chartType} />

      <p className="source">
        出典:{' '}
        <button className="source-link" onClick={() => onNavigate('catalog')}>
          本LP「カタログ」タブ
        </button>
        {res.sourceUrl ? (
          <>
            {' '}
            / 元データ:{' '}
            <a href={res.sourceUrl} target="_blank" rel="noreferrer">
              {res.sourceUrl}
            </a>
          </>
        ) : null}
      </p>
    </section>
  )
}

export default ReposView