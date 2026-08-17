export interface PopulationData {
  source: string
  unit: string
  labels: string[]
  data: number[]
  isLive: boolean
  collectedAt?: string
}

export interface Repo {
  name: string
  owner: string
  category: string
  description: string | null
  language: string | null
  license: string | null
  stars: number | null
  forks: number | null
  pushedAt: string | null
}

export interface ReposResponse {
  categories: string[]
  repos: Repo[]
  isLive: boolean
  sourceUrl?: string
  updatedAt?: string
  collectedAt?: string
}

export interface CollectorInfo {
  id: string
  name: string
  cron: string | null
  collectedAt: string | null
  stale: boolean
}

export type ChartType = 'category' | 'stars' | 'language' | 'activity'