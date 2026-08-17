import { useCallback, useEffect, useMemo, useState } from 'react'
import RepoModal from './RepoModal'
import FreshnessBadge from './FreshnessBadge'
import { fetchRepos } from '../api'
import { readHashParams, setHash } from '../hash'
import { downloadCsv, downloadJson } from '../download'
import type { Repo, ReposResponse } from '../types'

type SortKey = 'stars' | 'name' | 'language' | 'updated'

const FAVORITES_KEY = 'ebpm-favorites'

function repoKey(r: Repo): string {
  return `${r.owner}/${r.name}`
}

function formatStars(n: number | null): string {
  if (n === null || n === undefined) return '-'
  return n.toLocaleString('en-US')
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function sortRepos(repos: Repo[], sort: SortKey): Repo[] {
  const arr = [...repos]
  switch (sort) {
    case 'stars':
      arr.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      break
    case 'name':
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      break
    case 'language':
      arr.sort((a, b) => (a.language ?? '').localeCompare(b.language ?? '', 'ja'))
      break
    case 'updated':
      arr.sort((a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? ''))
      break
  }
  return arr
}

function Catalog() {
  const [res, setRes] = useState<ReposResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('stars')
  const [favOnly, setFavOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [modalRepo, setModalRepo] = useState<Repo | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchRepos()
      .then(setRes)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      })
  }, [])

  useEffect(() => {
    const params = readHashParams()
    setQuery(params.get('q') ?? '')
    const s = params.get('sort')
    setSort(s === 'name' || s === 'language' || s === 'updated' ? s : 'stars')
    setFavOnly(params.get('fav') === '1')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
  }, [favorites])

  useEffect(() => {
    setHash('catalog', {
      q: query,
      sort,
      fav: favOnly ? '1' : '',
    })
  }, [query, sort, favOnly])

  const filtered = useMemo(() => {
    if (!res) return []
    const q = query.trim().toLowerCase()
    return res.repos.filter((r) => {
      if (q) {
        const haystack = `${r.owner} ${r.name} ${r.description ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (favOnly && !favorites.has(repoKey(r))) return false
      return true
    })
  }, [res, query, favOnly, favorites])

  const byCategory = useMemo(() => {
    const map = new Map<string, Repo[]>()
    if (!res) return map
    for (const cat of res.categories) {
      const list = filtered.filter((r) => r.category === cat)
      if (list.length > 0) {
        map.set(cat, sortRepos(list, sort))
      }
    }
    return map
  }, [res, filtered, sort])

  const toggleFavorite = (r: Repo) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      const key = repoKey(r)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const exportCsv = () => {
    if (!res) return
    const rows: (string | number)[][] = [
      ['owner', 'name', 'category', 'description', 'language', 'license', 'stars', 'forks', 'updated'],
    ]
    for (const r of filtered) {
      rows.push([
        r.owner,
        r.name,
        r.category,
        r.description ?? '',
        r.language ?? '',
        r.license ?? '',
        r.stars ?? '',
        r.forks ?? '',
        r.pushedAt ?? '',
      ])
    }
    downloadCsv('ebpm-catalog.csv', rows)
  }

  if (error) {
    return <p className="error">エラー: {error}</p>
  }
  if (!res) {
    return <p>読み込み中...</p>
  }

  return (
    <section>
      <h1>EBPM リポジトリカタログ</h1>
      <p className="badge">
        {res.isLive
          ? 'GitHub API の最新値を表示中'
          : '静的カタログを表示中（GITHUB_TOKEN を設定すると最新値を取得）'}
      </p>
      <FreshnessBadge collectedAt={res.collectedAt} />
      <p className="source">
        {res.repos.length}リポジトリ / {res.categories.length}カテゴリ
        {res.sourceUrl ? (
          <>
            {' '}
            / 出典:{' '}
            <a href={res.sourceUrl} target="_blank" rel="noreferrer">
              {res.sourceUrl}
            </a>
          </>
        ) : null}
        {res.updatedAt ? <> / 更新: {res.updatedAt}</> : null}
      </p>

      <div className="catalog-controls">
        <label className="search-box">
          <span>検索</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="owner / 名前 / 説明を検索"
            aria-label="カタログ検索"
          />
        </label>
        <label className="filter-block">
          <span>並び替え</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="並び替え">
            <option value="stars">スター数順</option>
            <option value="name">名前順</option>
            <option value="language">言語順</option>
            <option value="updated">更新順</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
          />
          お気に入りのみ（{favorites.size}件）
        </label>
        <div className="export-btns">
          <button className="export-btn" onClick={exportCsv} aria-label="CSV ダウンロード">
            CSV 出力（{filtered.length}件）
          </button>
          <button
            className="export-btn"
            onClick={() => downloadJson('ebpm-catalog.json', filtered)}
            aria-label="JSON ダウンロード"
          >
            JSON 出力
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="note">条件に一致するリポジトリがありません。</p>
      ) : null}

      {[...byCategory.keys()].map((cat) => (
        <div key={cat} className="catalog-category">
          <h2>{cat}</h2>
          <p className="source">{byCategory.get(cat)?.length ?? 0}件</p>
          <table className="catalog-table">
            <thead>
              <tr>
                <th className="fav-col">★</th>
                <th>リポジトリ</th>
                <th>説明</th>
                <th>言語</th>
                <th>ライセンス</th>
                <th className="num">★</th>
                <th className="detail-col" />
              </tr>
            </thead>
            <tbody>
              {byCategory.get(cat)?.map((r) => {
                const fav = favorites.has(repoKey(r))
                return (
                  <tr key={repoKey(r)}>
                    <td className="fav-col">
                      <button
                        className={fav ? 'fav-btn active' : 'fav-btn'}
                        onClick={() => toggleFavorite(r)}
                        aria-label={`お気に入り ${repoKey(r)}`}
                        aria-pressed={fav}
                      >
                        {fav ? '★' : '☆'}
                      </button>
                    </td>
                    <td>
                      <a href={`https://github.com/${r.owner}/${r.name}`} target="_blank" rel="noreferrer">
                        {r.owner}/{r.name}
                      </a>
                    </td>
                    <td className="desc">{r.description}</td>
                    <td>{r.language ?? '-'}</td>
                    <td>{r.license ?? '-'}</td>
                    <td className="num">{formatStars(r.stars)}</td>
                    <td className="detail-col">
                      <button className="repo-detail-btn" onClick={() => setModalRepo(r)} aria-label={`詳細 ${repoKey(r)}`}>
                        詳細
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      <RepoModal
        repo={modalRepo}
        isFavorite={modalRepo ? favorites.has(repoKey(modalRepo)) : false}
        onToggleFavorite={() => modalRepo && toggleFavorite(modalRepo)}
        onClose={() => setModalRepo(null)}
      />
    </section>
  )
}

export default Catalog