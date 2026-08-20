// 収集先 URL の安全性判定（SSRF 対策）
//
// ホスト名・IP リテラルを検査し、プライベート・ループバック・リンクローカル・
// メタデータ・ULA・特殊用途 IPv4 範囲を遮断する。
// DNS 解決後にリダイレクト先が変わるケース（DNS rebinding 等）は REDIRECT_CHECK で検証する。

const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.azure.internal',
  'metadata.aws.internal',
])

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.localdomain']

// 非グローバル IPv4 範囲 [start, end]
const BLOCKED_IPV4_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8        未指定
  [0x0a000000, 0x0affffff], // 10.0.0.0/8       RFC1918
  [0x64400000, 0x647fffff], // 100.64.0.0/10    CGNAT
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8      ループバック
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16   リンクローカル（メタデータ含む）
  [0xac100000, 0xac1fffff], // 172.16.0.0/12    RFC1918
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24     IETF 予約
  [0xc0000200, 0xc00002ff], // 192.0.2.0/24     TEST-NET-1
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16   RFC1918
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15    ベンチマーク
  [0xc6336400, 0xc63364ff], // 198.51.100.0/24  TEST-NET-2
  [0xcb007100, 0xcb0071ff], // 203.0.113.0/24   TEST-NET-3
  [0xe0000000, 0xefffffff], // 224.0.0.0/4      マルチキャスト
  [0xf0000000, 0xffffffff], // 240.0.0.0/4      予約
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }
  let n = 0
  for (const p of parts) {
    const b = Number(p)
    if (!Number.isInteger(b) || b < 0 || b > 255) {
      return null
    }
    n = n * 256 + b
  }
  return n >>> 0
}

function isBlockedIPv4(n: number): boolean {
  return BLOCKED_IPV4_RANGES.some(([start, end]) => n >= start && n <= end)
}

// IPv6 マッピング形式（::ffff:a.b.c.d 等）の末尾 IPv4 を抽出
function ipv4FromMappedIPv6(host: string): number | null {
  const m = host.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  return m ? ipv4ToInt(m[1]) : null
}

export function hostIsBlocked(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '')
  if (!host) {
    return true
  }
  if (host === 'localhost' || METADATA_HOSTS.has(host)) {
    return true
  }
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return true
  }

  if (host.includes(':')) {
    // IPv6（または IPv6 マッピング）
    if (host === '::1' || host === '0:0:0:0:0:0:0:1') {
      return true
    }
    if (host.startsWith('fc') || host.startsWith('fd')) {
      return true // fc00::/7 ULA
    }
    if (host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) {
      return true // fe80::/10 リンクローカル
    }
    const mapped = ipv4FromMappedIPv6(host)
    if (mapped !== null) {
      return isBlockedIPv4(mapped)
    }
    return false
  }

  const ip = ipv4ToInt(host)
  if (ip !== null) {
    return isBlockedIPv4(ip)
  }
  return false
}

export function isSafeTarget(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') {
    return false
  }
  return !hostIsBlocked(u.hostname)
}
