import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const populationMock = {
  source: '政府統計総合窓口（e-Stat）',
  unit: '人',
  labels: ['2020', '2021'],
  data: [125710000, 125502000],
  isLive: false,
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
  })

  it('LP の考察タブに EBPM ツールの考察が表示される', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', {
        name: '考察: EBPM に関連するツールとは、どのようなものを構築すればよいのか',
      }),
    ).toBeInTheDocument()
  })

  it('日本の人口タブで人口データを表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '日本の人口' }))

    expect(await screen.findByText('日本の総人口の推移')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('静的データ')
  })

  it('EBPMリポジトリタブでカテゴリフィルタを表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'EBPMリポジトリ' }))

    expect(await screen.findByRole('combobox')).toBeInTheDocument()
    expect(screen.getByLabelText('OSSツール')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('OSSツール')).toBeChecked())
  })

  it('カタログタブで EBPM カタログをページ内表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'カタログ' }))

    expect(await screen.findByText('EBPM リポジトリカタログ')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'py-why/DoWhy' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'OSSツール' }),
    ).toBeInTheDocument()
    expect(screen.getByText('因果推論フレームワーク')).toBeInTheDocument()
  })
})