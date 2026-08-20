import { useCallback, useEffect, useState } from 'react'
import { fetchPopulation, fetchRepos } from '../api'
import type { PopulationData, ReposResponse } from '../types'
import type { Tab } from '../App'

function formatDate(iso: string | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10)
}

interface Props {
  onNavigate: (tab: Tab) => void
}

function DataStatusStrip({ onNavigate }: Props) {
  const [population, setPopulation] = useState<PopulationData | null>(null)
  const [repos, setRepos] = useState<ReposResponse | null>(null)

  const load = useCallback(() => {
    fetchPopulation().then(setPopulation)
    fetchRepos().then(setRepos)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const period =
    population && population.labels.length > 0
      ? `${population.labels[0]}–${population.labels[population.labels.length - 1]}`
      : '-'

  return (
    <div className="data-status-strip">
      <div className="data-status-item">
        <span className="data-status-label">人口</span>
        <span>{population ? (population.isLive ? '最新データ' : '固定スナップショット') : '読込中'}</span>
        <span className="data-status-meta">
          対象: {period} / 取得: {formatDate(population?.collectedAt)}
        </span>
      </div>
      <div className="data-status-item">
        <span className="data-status-label">EBPM OSS</span>
        <span>
          {repos ? `${repos.repos.length}件 / ${repos.isLive ? '最新データ' : '固定カタログ'}` : '読込中'}
        </span>
        <span className="data-status-meta">取得: {formatDate(repos?.collectedAt)}</span>
      </div>
      <button className="source-link" onClick={() => onNavigate('quality')}>
        出典と更新方法
      </button>
    </div>
  )
}

export default DataStatusStrip
