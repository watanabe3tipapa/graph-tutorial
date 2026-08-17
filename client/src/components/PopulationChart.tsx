import { Line } from 'react-chartjs-2'
import type { TooltipItem } from 'chart.js'
import '../chartSetup'
import type { PopulationData } from '../types'

interface Props {
  data: PopulationData
}

function PopulationChart({ data }: Props) {
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: '日本の総人口の推移',
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${context.dataset.label ?? ''}: ${context.parsed.y?.toLocaleString() ?? ''} ${data.unit}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: { display: true, text: `人口（${data.unit}）` },
      },
      x: {
        title: { display: true, text: '年' },
      },
    },
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: '総人口',
        data: data.data,
        borderColor: '#00B7FF',
        backgroundColor: 'rgba(0, 183, 255, 0.15)',
        fill: true,
        tension: 0.1,
      },
    ],
  }

  return (
    <div className="chart-wrap">
      <Line data={chartData} options={options} />
    </div>
  )
}

export default PopulationChart