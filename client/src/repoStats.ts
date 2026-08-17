import type { Repo } from './types'

export interface Series {
  labels: string[]
  data: number[]
}

export function countByCategory(repos: Repo[]): Series {
  const counts = new Map<string, number>()
  for (const r of repos) {
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    labels: entries.map((e) => e[0]),
    data: entries.map((e) => e[1]),
  }
}

export function topByStars(repos: Repo[], n = 10): Series {
  const withStars = repos
    .filter((r) => r.stars != null)
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, n)
  return {
    labels: withStars.map((r) => `${r.owner}/${r.name}`),
    data: withStars.map((r) => r.stars ?? 0),
  }
}

export function countByLanguage(repos: Repo[]): Series {
  const counts = new Map<string, number>()
  for (const r of repos) {
    if (!r.language) continue
    for (const lang of r.language.split('/')) {
      const key = lang.trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    labels: entries.map((e) => e[0]),
    data: entries.map((e) => e[1]),
  }
}

export function countByActivityYear(repos: Repo[]): Series {
  const counts = new Map<string, number>()
  for (const r of repos) {
    const year = r.pushedAt ? r.pushedAt.slice(0, 4) : null
    if (!year) continue
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return {
    labels: entries.map((e) => e[0]),
    data: entries.map((e) => e[1]),
  }
}