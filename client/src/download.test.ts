import { describe, expect, it } from 'vitest'
import { toCsv } from './download'

describe('toCsv', () => {
  it('BOM を先頭に付与する', () => {
    expect(toCsv([['年', '人口']]).startsWith('\uFEFF')).toBe(true)
  })

  it('カンマ・引用符・改行を含むセルをエスケープする', () => {
    const csv = toCsv([
      ['説明', '件数'],
      ['因果推論, 民主化', '2'],
      ['"引用"を含む', '3'],
    ])
    const body = csv.replace(/^\uFEFF/, '')
    expect(body).toContain('"因果推論, 民主化"')
    expect(body).toContain('"""引用""を含む"')
    expect(body).toContain('\r\n')
  })

  it('数値と文字列を連結して出力する', () => {
    const body = toCsv([
      [2020, 125710000],
      [2021, 125502000],
    ]).replace(/^\uFEFF/, '')
    expect(body).toBe('2020,125710000\r\n2021,125502000')
  })
})