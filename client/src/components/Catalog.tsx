import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRepos } from '../api'
import type { Repo, ReposResponse } from '../types'

function formatStars(n: number | null): string {
  if (n === null || n === undefined) return '-'
  return n.toLocaleString('en-US')
}

function repoUrl(repo: Repo): string {
  return `https://github.com/${repo.owner}/${repo.name}`
}

function Catalog() {
  const [res, setRes] = useState<ReposResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchRepos()
      .then(setRes)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byCategory = useMemo(() => {
    if (!res) return new Map<string, Repo[]>()
    const map = new Map<string, Repo[]>()
    for (const cat of res.categories) {
      map.set(cat, res.repos.filter((r) => r.category === cat))
    }
    return map
  }, [res])

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

      {res.categories.map((cat) => (
        <div key={cat} className="catalog-category">
          <h2>{cat}</h2>
          <p className="source">{byCategory.get(cat)?.length ?? 0}件</p>
          <table className="catalog-table">
            <thead>
              <tr>
                <th>リポジトリ</th>
                <th>説明</th>
                <th>言語</th>
                <th>ライセンス</th>
                <th className="num">★</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.get(cat)?.map((r) => (
                <tr key={`${r.owner}/${r.name}`}>
                  <td>
                    <a href={repoUrl(r)} target="_blank" rel="noreferrer">
                      {r.owner}/{r.name}
                    </a>
                  </td>
                  <td className="desc">{r.description}</td>
                  <td>{r.language ?? '-'}</td>
                  <td>{r.license ?? '-'}</td>
                  <td className="num">{formatStars(r.stars)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

export default Catalog