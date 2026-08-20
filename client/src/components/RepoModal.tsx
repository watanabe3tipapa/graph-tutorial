import { useEffect } from 'react'
import type { Repo } from '../types'

interface Props {
  repo: Repo | null
  isFavorite: boolean
  onToggleFavorite: () => void
  onClose: () => void
}

function RepoModal({ repo, isFavorite, onToggleFavorite, onClose }: Props) {
  useEffect(() => {
    if (!repo) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [repo, onClose])

  if (!repo) {
    return null
  }

  const fields: { label: string; value: string }[] = [
    { label: 'カテゴリ', value: repo.category },
    { label: '言語', value: repo.language ?? '-' },
    { label: 'ライセンス', value: repo.license ?? '-' },
    { label: 'スター数', value: repo.stars != null ? repo.stars.toLocaleString('en-US') : '-' },
    { label: 'フォーク', value: repo.forks != null ? repo.forks.toLocaleString('en-US') : '-' },
    { label: '最終更新', value: repo.pushedAt ?? '-' },
  ]

  return (
    <div className="modal-root">
      <button
        type="button"
        className="modal-overlay"
        aria-label="ダイアログを閉じる"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="modal" role="dialog" aria-modal="true" aria-label={repo.owner + '/' + repo.name}>
        <div className="modal-head">
          <h2>
            {repo.owner}/{repo.name}
          </h2>
          <button className="modal-close" aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        </div>

        {repo.description ? <p className="modal-desc">{repo.description}</p> : null}

        <dl className="modal-fields">
          {fields.map((f) => (
            <div key={f.label} className="modal-field">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="modal-actions">
          <a
            href={`https://github.com/${repo.owner}/${repo.name}`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub で開く ↗
          </a>
          <button
            className="export-btn"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'お気に入りから解除' : 'お気に入りに追加'}
          >
            {isFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RepoModal