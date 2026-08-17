import {
  countByActivityYear,
  countByCategory,
  countByLanguage,
  topByStars,
} from './repoStats'
import type { Repo } from './types'

function repo(overrides: Partial<Repo>): Repo {
  return {
    name: 'x',
    owner: 'o',
    category: 'c1',
    description: null,
    language: 'Python',
    license: null,
    stars: 0,
    forks: null,
    pushedAt: null,
    ...overrides,
  }
}

describe('repoStats', () => {
  it('カテゴリ別の件数を集計する', () => {
    const repos = [
      repo({ category: 'A' }),
      repo({ category: 'A' }),
      repo({ category: 'B' }),
    ]
    expect(countByCategory(repos)).toEqual({
      labels: ['A', 'B'],
      data: [2, 1],
    })
  })

  it('スター数トップNを降順で返す（null は除外）', () => {
    const repos = [
      repo({ name: 'low', stars: 10 }),
      repo({ name: 'none', stars: null }),
      repo({ name: 'high', stars: 999 }),
    ]
    expect(topByStars(repos, 10)).toEqual({
      labels: ['o/high', 'o/low'],
      data: [999, 10],
    })
  })

  it('複合言語はスラッシュで分割して集計する', () => {
    const repos = [
      repo({ language: 'Python/R' }),
      repo({ language: 'R' }),
      repo({ language: null }),
    ]
    expect(countByLanguage(repos)).toEqual({
      labels: ['R', 'Python'],
      data: [2, 1],
    })
  })

  it('更新年別に集計し、pushedAt が無いものは除外する', () => {
    const repos = [
      repo({ pushedAt: '2024-03-01' }),
      repo({ pushedAt: '2025-01-01' }),
      repo({ pushedAt: null }),
    ]
    expect(countByActivityYear(repos)).toEqual({
      labels: ['2024', '2025'],
      data: [1, 1],
    })
  })
})