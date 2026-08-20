import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}))

const populationMock = {
  source: '政府統計総合窓口（e-Stat）',
  unit: '人',
  labels: ['2020', '2021'],
  data: [125710000, 125502000],
  isLive: false,
  collectedAt: '2026-08-16T00:00:00.000Z',
}

const reposMock = {
  categories: ['OSSツール', 'データセット'],
  repos: [
    {
      name: 'DoWhy',
      owner: 'py-why',
      category: 'OSSツール',
      description: '因果推論フレームワーク',
      language: 'Python',
      license: 'MIT',
      stars: 8237,
      forks: null,
      pushedAt: null,
    },
    {
      name: 'delphi-epidata',
      owner: 'cmu-delphi',
      category: 'データセット',
      description: '公衆衛生データ',
      language: 'Python',
      license: 'MIT',
      stars: 420,
      forks: null,
      pushedAt: null,
    },
  ],
  isLive: false,
  sourceUrl: 'https://example.test/',
  collectedAt: '2026-08-16T00:00:00.000Z',
}

describe('App', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/population') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(populationMock) })
      }
      if (url === '/api/repos') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reposMock) })
      }
      return Promise.resolve({ ok: false, status: 404 })
    }) as unknown as typeof fetch
    history.replaceState(null, '', '/')
    localStorage.clear()
  })

  it('ホームタブにヒーローと3つのCTAが表示される', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'EBPMのためのデータ探索・可視化スターター' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '人口推移をみる' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EBPM OSSを探す' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ローカルで動かす' })).toBeInTheDocument()
  })

  it('データ品質・仕組みタブに設計思想が表示される', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'データ品質・仕組み' }))
    expect(
      screen.getByRole('heading', { name: '継続運用できる内製能力を残す' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '正確性至上主義' })).toBeInTheDocument()
  })

  it('日本の人口（デモ）タブで人口データを表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'デモ' }))

    expect(await screen.findByText('日本の総人口の推移')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('静的データ')
  })

  it('日本の人口（デモ）タブでデータ鮮度バッジを表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'デモ' }))

    expect(await screen.findByText(/データ更新: 2026-08-16/)).toBeInTheDocument()
  })

  it('導入するタブでコレクタ実行 UI がサーバ未接続時に劣化表示される', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '導入する' }))

    expect(await screen.findByText(/サーバ起動時のみ利用できます/)).toBeInTheDocument()
  })

  it('EBPMカタログタブで探索と概観を切り替えられる', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'EBPMカタログ' }))
    await screen.findByRole('link', { name: 'py-why/DoWhy' })

    await user.click(screen.getByRole('tab', { name: '概観（グラフ）' }))
    expect(await screen.findByTestId('chart-bar')).toBeInTheDocument()
    expect(screen.getByLabelText('OSSツール')).toBeInTheDocument()
    await user.click(screen.getByLabelText('OSSツール'))
    await waitFor(() => expect(screen.getByLabelText('OSSツール')).toBeChecked())
  })

  it('カタログタブの検索でリポジトリを絞り込む', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'EBPMカタログ' }))

    await user.type(await screen.findByLabelText('カタログ検索'), 'delphi')

    expect(screen.getByRole('link', { name: 'cmu-delphi/delphi-epidata' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'py-why/DoWhy' })).not.toBeInTheDocument()
  })

  it('カタログタブでお気に入りを登録し「お気に入りのみ」で絞り込む', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'EBPMカタログ' }))
    await screen.findByRole('link', { name: 'py-why/DoWhy' })

    await user.click(screen.getByLabelText('お気に入り py-why/DoWhy'))
    expect(screen.getByLabelText('お気に入り py-why/DoWhy')).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('checkbox', { name: /お気に入りのみ/ }))
    expect(screen.getByRole('link', { name: 'py-why/DoWhy' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'cmu-delphi/delphi-epidata' })).not.toBeInTheDocument()
  })

  it('カタログタブで詳細モーダルを開閉できる', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'EBPMカタログ' }))
    await screen.findByRole('link', { name: 'py-why/DoWhy' })

    await user.click(screen.getByLabelText('詳細 py-why/DoWhy'))
    expect(screen.getByRole('dialog')).toHaveTextContent('因果推論フレームワーク')
    expect(screen.getByText('GitHub で開く ↗')).toBeInTheDocument()

    await user.click(screen.getByLabelText('閉じる'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('日本の人口タブで年範囲を選択するとテーブルが絞り込まれる', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'デモ' }))

    const table = await screen.findByTestId('population-table')
    expect(within(table).getByText('2020')).toBeInTheDocument()
    expect(within(table).getByText('2021')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('開始年'), '2021')
    await user.selectOptions(screen.getByLabelText('終了年'), '2021')

    expect(within(table).getByText('2021')).toBeInTheDocument()
    expect(within(table).queryByText('2020')).not.toBeInTheDocument()
  })

  it('URL ハッシュ #population から人口タブが復元される', async () => {
    history.replaceState(null, '', '#population')
    render(<App />)
    expect(await screen.findByText('日本の総人口の推移')).toBeInTheDocument()
  })

  it('URL ハッシュ #catalog?q=... で検索状態が復元される', async () => {
    history.replaceState(null, '', '#catalog?q=delphi')
    render(<App />)
    expect(await screen.findByRole('link', { name: 'cmu-delphi/delphi-epidata' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'py-why/DoWhy' })).not.toBeInTheDocument()
  })

  it('タブを矢印キーで移動できる', async () => {
    const user = userEvent.setup()
    render(<App />)
    const homeTab = screen.getByRole('tab', { name: 'ホーム' })
    homeTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: '日本の総人口の推移' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'EBPM リポジトリカタログ' })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('heading', { name: '日本の総人口の推移' })).toBeInTheDocument()
    await user.keyboard('{Home}')
    expect(
      screen.getByRole('heading', { name: 'EBPMのためのデータ探索・可視化スターター' }),
    ).toBeInTheDocument()
  })
})