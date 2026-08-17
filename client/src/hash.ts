export function currentHashTab(): string | null {
  const raw = window.location.hash.replace(/^#/, '')
  const qIdx = raw.indexOf('?')
  const tab = qIdx >= 0 ? raw.slice(0, qIdx) : raw
  return tab || null
}

export function readHashParams(): URLSearchParams {
  const raw = window.location.hash.replace(/^#/, '')
  const qIdx = raw.indexOf('?')
  const qs = qIdx >= 0 ? raw.slice(qIdx + 1) : ''
  return new URLSearchParams(qs)
}

export function setHash(tab: string, params?: Record<string, string>): void {
  const pairs = params
    ? Object.entries(params).filter(([, v]) => v !== '')
    : []
  const qs = pairs.length > 0 ? new URLSearchParams(pairs).toString() : ''
  const next = qs ? `#${tab}?${qs}` : `#${tab}`
  if (window.location.hash !== next) {
    history.replaceState(null, '', window.location.pathname + window.location.search + next)
  }
}