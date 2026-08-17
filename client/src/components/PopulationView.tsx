import { useCallback, useEffect, useMemo, useState } from 'react'
import PopulationChart from './PopulationChart'
import FreshnessBadge from './FreshnessBadge'
import { fetchPopulation } from '../api'
import { downloadCsv } from '../download'
import type { PopulationData } from '../types'

function PopulationView() {
  const [data, setData] = useState<PopulationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startIdx, setStartIdx] = useState(0)
  const [endIdx, setEndIdx] = useState(0)

  const load = useCallback(() => {
    setError(null)
    fetchPopulation()
      .then((d) => {
        setData(d)
        setStartIdx(0)
        setEndIdx(d.labels.length > 0 ? d.labels.length - 1 : 0)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sliced = useMemo(() => {
    if (!data) return null
    const from = Math.min(startIdx, endIdx)
    const to = Math.max(startIdx, endIdx)
    return {
      ...data,
      labels: data.labels.slice(from, to + 1),
      data: data.data.slice(from, to + 1),
    }
  }, [data, startIdx, endIdx])

  const exportCsv = () => {
    if (!sliced) return
    const rows: (string | number)[][] = [['年', '総人口（' + sliced.unit + '）']]
    for (let i = 0; i < sliced.labels.length; i++) {
      rows.push([sliced.labels[i], sliced.data[i]])
    }
    downloadCsv('japan-population.csv', rows)
  }

  if (error) {
    return <p className="error">エラー: {error}</p>
  }
  if (!data || !sliced) {
    return <p>読み込み中...</p>
  }

  return (
    <section>
      <h1>日本の総人口の推移</h1>
      <p className="badge" data-testid="badge">
        {data.isLive
          ? 'e-Stat API の最新データを表示中'
          : 'e-Stat API 未設定のため静的データを表示中（ESTAT_APP_ID を設定すると最新データになります）'}
      </p>
      <FreshnessBadge collectedAt={data.collectedAt} />

      <div className="range-controls">
        <label className="filter-block">
          <span>開始年</span>
          <select value={data.labels[startIdx]} onChange={(e) => setStartIdx(data.labels.indexOf(e.target.value))} aria-label="開始年">
            {data.labels.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-block">
          <span>終了年</span>
          <select value={data.labels[endIdx]} onChange={(e) => setEndIdx(data.labels.indexOf(e.target.value))} aria-label="終了年">
            {data.labels.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="range-info">
          {sliced.labels[0]} 〜 {sliced.labels[sliced.labels.length - 1]}（{sliced.labels.length}年分）
        </span>
        <button className="export-btn" onClick={exportCsv} aria-label="CSV ダウンロード">
          CSV 出力
        </button>
      </div>

      <PopulationChart data={sliced} />

      <h2>年別データ</h2>
      <table className="data-table" data-testid="population-table">
        <thead>
          <tr>
            <th>年</th>
            <th>総人口（{sliced.unit}）</th>
          </tr>
        </thead>
        <tbody>
          {sliced.labels.map((y, i) => (
            <tr key={y}>
              <td>{y}</td>
              <td>{sliced.data[i].toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="source">出典: {data.source}</p>
    </section>
  )
}

export default PopulationView