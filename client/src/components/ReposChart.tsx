import { useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import '../chartSetup'
import type { ChartType, Repo } from '../types'
import { countByActivityYear, countByCategory, countByLanguage, topByStars } from '../repoStats'

interface Props {
  repos: Repo[]
  type: ChartType
}

const CHART_TITLES: Record<ChartType, string> = {
  category: 'カテゴリ別リポジトリ数',
  stars: 'スター数トップ10',
  language: '言語分布',
  activity: '更新年別アクティビティ',
}

function ReposChart({ repos, type }: Props) {
  const series = useMemo(() => {
    switch (type) {
      case 'category':
        return countByCategory(repos)
      case 'stars':
        return topByStars(repos)
      case 'language':
        return countByLanguage(repos)
      case 'activity':
        return countByActivityYear(repos)
    }
  }, [repos, type])

  if (type === 'activity' && series.data.length === 0) {
    return (
      <p className="note">
        更新日（pushedAt）データがありません。GITHUB_TOKEN を設定してコレクタを実行すると表示されます。
      </p>
    )
  }
  if (series.data.length === 0) {
    return <p className="note">選択条件に一致するデータがありません。</p>
  }

  const commonOptions = {
    responsive: true,
    plugins: {
      title: { display: true, text: CHART_TITLES[type] },
    },
  }

  if (type === 'language') {
    const doughnutData = {
      labels: series.labels,
      datasets: [{ data: series.data, backgroundColor: PALETTE }],
    }
    return (
      <div className="chart-wrap">
        <Doughnut data={doughnutData} options={commonOptions} />
      </div>
    )
  }

  const barData = {
    labels: series.labels,
    datasets: [
      {
        label: type === 'category' ? 'リポジトリ数' : type === 'stars' ? 'スター数' : 'リポジトリ数',
        data: series.data,
        backgroundColor: 'rgba(0, 183, 255, 0.6)',
        borderColor: '#00B7FF',
        borderWidth: 1,
      },
    ],
  }

  const barOptions = {
    ...commonOptions,
    indexAxis: type === 'stars' ? ('y' as const) : undefined,
  }

  return (
    <div className="chart-wrap">
      <Bar data={barData} options={barOptions} />
    </div>
  )
}

const PALETTE = [
  '#4E79A7',
  '#F28E2B',
  '#E15759',
  '#76B7B2',
  '#59A14F',
  '#EDC948',
  '#B07AA1',
  '#FF9DA7',
  '#9C755F',
  '#BAB0AC',
]

export default ReposChart