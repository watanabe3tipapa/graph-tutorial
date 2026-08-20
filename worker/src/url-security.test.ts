import { describe, it, expect } from 'vitest'
import { hostIsBlocked, isSafeTarget } from './url-security'

describe('hostIsBlocked', () => {
  it('ループバック・プライベート・リンクローカル IPv4 を拒否する', () => {
    expect(hostIsBlocked('127.0.0.1')).toBe(true)
    expect(hostIsBlocked('10.0.0.1')).toBe(true)
    expect(hostIsBlocked('172.16.0.1')).toBe(true)
    expect(hostIsBlocked('192.168.1.1')).toBe(true)
    expect(hostIsBlocked('169.254.169.254')).toBe(true)
    expect(hostIsBlocked('100.64.0.1')).toBe(true)
  })

  it('パブリック IPv4 は許可する', () => {
    expect(hostIsBlocked('8.8.8.8')).toBe(false)
    expect(hostIsBlocked('140.82.112.3')).toBe(false)
    expect(hostIsBlocked('1.1.1.1')).toBe(false)
  })

  it('メタデータ・localhost・内部ホスト名を拒否する', () => {
    expect(hostIsBlocked('metadata.google.internal')).toBe(true)
    expect(hostIsBlocked('metadata.azure.internal')).toBe(true)
    expect(hostIsBlocked('metadata.aws.internal')).toBe(true)
    expect(hostIsBlocked('localhost')).toBe(true)
    expect(hostIsBlocked('foo.local')).toBe(true)
    expect(hostIsBlocked('db.internal')).toBe(true)
  })

  it('IPv6 のループバック・ULA・リンクローカルを拒否する', () => {
    expect(hostIsBlocked('::1')).toBe(true)
    expect(hostIsBlocked('0:0:0:0:0:0:0:1')).toBe(true)
    expect(hostIsBlocked('fc00::1')).toBe(true)
    expect(hostIsBlocked('fd12:3456::1')).toBe(true)
    expect(hostIsBlocked('fe80::1')).toBe(true)
  })

  it('IPv6 マッピングされたプライベート IPv4 を拒否する', () => {
    expect(hostIsBlocked('::ffff:127.0.0.1')).toBe(true)
    expect(hostIsBlocked('::ffff:169.254.169.254')).toBe(true)
    expect(hostIsBlocked('::ffff:10.0.0.5')).toBe(true)
  })

  it('通常のホスト名は許可する', () => {
    expect(hostIsBlocked('github.com')).toBe(false)
    expect(hostIsBlocked('api.github.com')).toBe(false)
    expect(hostIsBlocked('raw.githubusercontent.com')).toBe(false)
  })
})

describe('isSafeTarget', () => {
  it('https かつ安全なホストのみ許可する', () => {
    expect(isSafeTarget('https://github.com/watanabe3tipapa/graph-tutorial')).toBe(true)
    expect(isSafeTarget('https://raw.githubusercontent.com/foo/bar/master/readme.md')).toBe(true)
    expect(isSafeTarget('http://github.com/foo')).toBe(false)
    expect(isSafeTarget('ftp://github.com/foo')).toBe(false)
    expect(isSafeTarget('https://127.0.0.1/')).toBe(false)
    expect(isSafeTarget('https://localhost/')).toBe(false)
    expect(isSafeTarget('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isSafeTarget('https://metadata.google.internal/')).toBe(false)
    expect(isSafeTarget('not a url')).toBe(false)
    expect(isSafeTarget('')).toBe(false)
  })
})
