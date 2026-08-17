import { useCallback, useEffect, useState } from 'react'
import PopulationChart from './PopulationChart'
import { fetchPopulation } from '../api'
import type { PopulationData } from '../types'

function PopulationView() {
  const [data, setData] = useState<PopulationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchPopulation()
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return <p className="error">エラー: {error}</p>
  }
  if (!data) {
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
      <PopulationChart data={data} />
      <p className="source">出典: {data.source}</p>
    </section>
  )
}

export default PopulationView