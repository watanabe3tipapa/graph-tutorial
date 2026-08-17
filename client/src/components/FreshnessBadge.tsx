interface Props {
  collectedAt?: string
  staleAfterMs?: number
}

const DAY = 24 * 60 * 60 * 1000

function FreshnessBadge({ collectedAt, staleAfterMs }: Props) {
  if (!collectedAt) {
    return null
  }
  const date = new Date(collectedAt)
  if (isNaN(date.getTime())) {
    return null
  }
  const threshold = staleAfterMs ?? 7 * DAY
  const stale = Date.now() - date.getTime() > threshold
  const label = `データ更新: ${date.toISOString().slice(0, 10)}`

  return (
    <span
      className={stale ? 'freshness-badge stale' : 'freshness-badge'}
      title={stale ? '最終更新から長期間経過しています' : '最終更新日時'}
    >
      {label}
      {stale ? '（古い可能性があります）' : ''}
    </span>
  )
}

export default FreshnessBadge