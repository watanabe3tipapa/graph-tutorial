import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Home from './components/Home'
import PopulationView from './components/PopulationView'
import Catalog from './components/Catalog'
import Usage from './components/Usage'
import Quality from './components/Quality'
import { currentHashTab, setHash } from './hash'

export type Tab = 'home' | 'population' | 'catalog' | 'usage' | 'quality'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'population', label: 'デモ' },
  { id: 'catalog', label: 'EBPMカタログ' },
  { id: 'usage', label: '導入する' },
  { id: 'quality', label: 'データ品質・仕組み' },
]

function initialTab(): Tab {
  const h = currentHashTab()
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'home'
}

function App() {
  const [tab, setTab] = useState<Tab>(initialTab)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setHash(tab)
  }, [tab])

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: Tab) => {
    const idx = TABS.findIndex((t) => t.id === id)
    let next: Tab | null = null
    if (e.key === 'ArrowRight') next = TABS[(idx + 1) % TABS.length].id
    else if (e.key === 'ArrowLeft') next = TABS[(idx - 1 + TABS.length) % TABS.length].id
    else if (e.key === 'Home') next = TABS[0].id
    else if (e.key === 'End') next = TABS[TABS.length - 1].id
    if (next) {
      e.preventDefault()
      setTab(next)
      document.getElementById(`tab-${next}`)?.focus()
    }
  }

  return (
    <div className="app">
      <header className="notebook-header">
        <span className="logo">graph-tutorial</span>
        <span className="logo-sub">Evidence-Based Policy Making</span>
      </header>

      <div className="leaf-tabs" role="tablist" aria-label="メインナビゲーション">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? 'leaf-tab active' : 'leaf-tab'}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="notebook">
        <div className="binder-holes" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="leaf">
          <section
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
          >
            {tab === 'home' && <Home onNavigate={setTab} />}
            {tab === 'population' && <PopulationView />}
            {tab === 'catalog' && <Catalog />}
            {tab === 'usage' && <Usage />}
            {tab === 'quality' && <Quality />}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App