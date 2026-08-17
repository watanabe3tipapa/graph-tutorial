import { useState } from 'react'
import Consideration from './components/Consideration'
import Framework from './components/Framework'
import PopulationView from './components/PopulationView'
import ReposView from './components/ReposView'
import Usage from './components/Usage'

export type Tab = 'consideration' | 'framework' | 'population' | 'repos' | 'usage'

const TABS: { id: Tab; label: string }[] = [
  { id: 'consideration', label: '考察' },
  { id: 'framework', label: 'データ収集' },
  { id: 'population', label: '日本の人口' },
  { id: 'repos', label: 'EBPMリポジトリ' },
  { id: 'usage', label: '使い方' },
]

function App() {
  const [tab, setTab] = useState<Tab>('consideration')

  return (
    <div className="app">
      <header className="notebook-header">
        <span className="logo">graph-tutorial</span>
        <span className="logo-sub">Evidence-Based Policy Making</span>
      </header>

      <div className="leaf-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'leaf-tab active' : 'leaf-tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="notebook" role="tabpanel">
        <div className="binder-holes" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="leaf">
          {tab === 'consideration' && <Consideration onNavigate={setTab} />}
          {tab === 'framework' && <Framework />}
          {tab === 'population' && <PopulationView />}
          {tab === 'repos' && <ReposView />}
          {tab === 'usage' && <Usage />}
        </div>
      </main>
    </div>
  )
}

export default App