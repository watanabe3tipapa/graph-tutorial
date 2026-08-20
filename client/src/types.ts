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

export interface AuditEntry {
  ts: string
  collector: string
  source: string
  status: string
  error: string | null
  keptExisting: boolean | null
  durationMs: number
}

export type KitesurfAction = 'markdown' | 'content' | 'screenshot' | 'pdf' | 'links'

export interface KitesurfCollectRequest {
  instruction?: string
  url?: string
  action?: KitesurfAction
  waitUntil?: string
}

export interface KitesurfResponse {
  success: boolean
  action?: KitesurfAction
  url?: string
  title?: string | null
  contentType?: string
  result?: unknown
  error?: string
}

export type ChartType = 'category' | 'stars' | 'language' | 'activity'