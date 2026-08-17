export interface PopulationData {
  source: string
  unit: string
  labels: string[]
  data: number[]
  isLive: boolean
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
}

export type ChartType = 'category' | 'stars' | 'language' | 'activity'