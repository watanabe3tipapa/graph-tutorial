import type { PopulationData, ReposResponse } from './types'
import populationFallback from './static/population.json'
import reposFallback from './static/ebpm-repos.json'

export async function fetchPopulation(): Promise<PopulationData> {
  try {
    const res = await fetch('/api/population')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  } catch {
    return populationFallback
  }
}

export async function fetchRepos(): Promise<ReposResponse> {
  try {
    const res = await fetch('/api/repos')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  } catch {
    return reposFallback
  }
}