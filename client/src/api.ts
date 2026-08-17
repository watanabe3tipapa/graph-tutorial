import type { PopulationData, ReposResponse } from './types'

export async function fetchPopulation(): Promise<PopulationData> {
  const res = await fetch('/api/population')
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchRepos(): Promise<ReposResponse> {
  const res = await fetch('/api/repos')
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}