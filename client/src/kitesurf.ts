import type { KitesurfCollectRequest, KitesurfResponse } from './types'

export const KITESURF_WORKER_URL: string =
  (import.meta.env.VITE_KITESURF_WORKER_URL as string | undefined) ?? ''

export function kitesurfEnabled(): boolean {
  return KITESURF_WORKER_URL !== ''
}

export async function runCollect(req: KitesurfCollectRequest): Promise<KitesurfResponse> {
  if (!kitesurfEnabled()) {
    throw new Error('Cloudflare Worker（VITE_KITESURF_WORKER_URL）が未設定です')
  }
  const res = await fetch(`${KITESURF_WORKER_URL.replace(/\/$/, '')}/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const data = (await res.json()) as KitesurfResponse
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  return data
}