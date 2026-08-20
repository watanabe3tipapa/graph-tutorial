import { isSafeTarget } from './url-security'

export interface Env {
  BROWSER: {
    quickAction: (action: string, options: Record<string, unknown>) => Promise<Response>
  }
  AI?: {
    run: (model: string, options: unknown) => Promise<unknown>
  }
  SNAPSHOTS?: KVNamespace
  ALLOWED_ORIGIN?: string
  AI_MODEL?: string
  ALLOWED_URL_PREFIXES?: string
  COLLECT_RATE_LIMIT?: string
  COLLECTOR_TOKEN?: string
  REDIRECT_CHECK?: string
}

const DEFAULT_REPO_URL = 'https://github.com/watanabe3tipapa/graph-tutorial'
const DEFAULT_AI_MODEL = '@cf/qwen/qwen2.5-7b-instruct'
const DEFAULT_ALLOWED_PREFIXES = ['https://github.com/watanabe3tipapa/graph-tutorial']

const ACTIONS = ['markdown', 'content', 'screenshot', 'pdf', 'links'] as const
type Action = (typeof ACTIONS)[number]

const SYSTEM_PROMPT =
  'You extract a browser action from a user instruction. ' +
  'Respond with JSON only, in the shape: {"url": "https://...", "action": "markdown"}. ' +
  'action must be one of: markdown, content, screenshot, pdf, links. ' +
  'markdown: extract the page as Markdown. ' +
  'content: capture the rendered HTML. ' +
  'screenshot: capture a screenshot image. ' +
  'pdf: render the page as a PDF. ' +
  'links: extract the links from the page. ' +
  'If no URL is given, use "https://github.com/watanabe3tipapa/graph-tutorial". ' +
  'Prefer markdown unless the instruction clearly asks for HTML, a screenshot, a PDF, or links. ' +
  'Respond with a single JSON object and nothing else.'

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function allowedUrlPrefixes(env: Env): string[] {
  return (env.ALLOWED_URL_PREFIXES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// 定数時間比較（Node の crypto は Worker 環境では使わない）
function safeEqual(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  if (ba.length !== bb.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < ba.length; i++) {
    diff |= ba[i] ^ bb[i]
  }
  return diff === 0
}

function corsHeaders(env: Env, origin: string | null): Headers {
  const allowed = allowedOrigins(env)
  const allowAll = allowed.includes('*')
  const value =
    allowAll || (origin && allowed.includes(origin)) ? (allowAll ? '*' : origin || '') : ''
  const h = new Headers()
  if (value) {
    h.set('Access-Control-Allow-Origin', value)
  }
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Content-Type, x-collector-token')
  h.set('Access-Control-Max-Age', '86400')
  return h
}

function json(data: unknown, status = 200, headers = new Headers()): Response {
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { status, headers: h })
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) {
    return false
  }
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isAction(value: unknown): value is Action {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value)
}

function mapKeyword(raw: string): Action {
  const s = raw.toLowerCase()
  if (s.includes('html') || s.includes('source') || s.includes('ソース')) {
    return 'content'
  }
  if (
    s.includes('screenshot') ||
    s.includes('screen') ||
    s.includes('画像') ||
    s.includes('スクショ') ||
    s.includes('スクリーン')
  ) {
    return 'screenshot'
  }
  if (s.includes('pdf') || s.includes('document') || s.includes('ドキュメント')) {
    return 'pdf'
  }
  if (s.includes('link') || s.includes('リンク') || s.includes('リンク集')) {
    return 'links'
  }
  return 'markdown'
}

async function extractWithAI(env: Env, instruction: string): Promise<{ url: string; action: Action }> {
  if (!env.AI) {
    throw new Error('Workers AI が未設定です（LLM 指示には AI バインディングが必要です）')
  }
  const model = env.AI_MODEL || DEFAULT_AI_MODEL
  const res = await env.AI.run(model, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: instruction },
    ],
  })
  const record = res as Record<string, unknown>
  const text =
    (record.response as string) ||
    (record.output_text as string) ||
    (record.output as string) ||
    (record.result as string) ||
    ''
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) {
    throw new Error('LLM の応答を JSON として解析できませんでした')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(m[0])
  } catch {
    throw new Error('LLM の応答を JSON として解析できませんでした')
  }
  const obj = parsed as Record<string, unknown>
  const url = typeof obj.url === 'string' && isValidUrl(obj.url) ? obj.url : DEFAULT_REPO_URL
  let action: Action = 'markdown'
  if (isAction(obj.action)) {
    action = obj.action
  } else if (typeof obj.action === 'string') {
    action = mapKeyword(obj.action)
  }
  return { url, action }
}

async function readResponse(
  res: unknown
): Promise<{ text: string; buf: ArrayBuffer; contentType: string }> {
  if (res && typeof res === 'object' && typeof (res as Response).arrayBuffer === 'function') {
    const r = res as Response
    const buf = await r.arrayBuffer()
    const contentType = (r.headers && r.headers.get && r.headers.get('content-type')) || ''
    return { text: new TextDecoder().decode(buf), buf, contentType }
  }
  const text = JSON.stringify(res ?? null)
  return {
    text,
    buf: new TextEncoder().encode(text).buffer,
    contentType: 'application/json',
  }
}

async function runAction(
  env: Env,
  action: Action,
  url: string,
  waitUntil?: string
): Promise<{ title?: string; contentType?: string; result: unknown }> {
  const options: Record<string, unknown> = { url }
  if (waitUntil) {
    options.gotoOptions = { waitUntil }
  }
  const res = await env.BROWSER.quickAction(action, options)
  const { text, buf, contentType } = await readResponse(res)

  if (action === 'screenshot' || action === 'pdf') {
    return { contentType: contentType || 'application/octet-stream', result: bufToBase64(buf) }
  }

  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // body が JSON でない場合はそのまま返す
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>
    if (obj.success === false) {
      const message =
        Array.isArray(obj.errors) && obj.errors.length > 0
          ? (obj.errors as Array<Record<string, unknown>>)
              .map((e) => String(e.message ?? JSON.stringify(e)))
              .join('; ')
          : 'Kitesurf の実行に失敗しました'
      throw new Error(message)
    }
    const meta =
      typeof obj.meta === 'object' && obj.meta !== null
        ? (obj.meta as Record<string, unknown>)
        : undefined
    return {
      title: typeof meta?.title === 'string' ? meta.title : undefined,
      result: obj.result,
    }
  }
  return { result: text }
}

// REDIRECT_CHECK=1 時のみ有効。リダイレクトを追って最終 URL が許可リストと安全性を
// 満たすか検証する（DNS rebinding・許可外ホストへの誘導対策）。
async function redirectTargetOk(
  env: Env,
  url: string,
  allowList: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (env.REDIRECT_CHECK !== '1') {
    return { ok: true }
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Range: 'bytes=0-0', 'User-Agent': 'graph-tutorial-worker' },
    })
    const finalUrl = res.url || url
    if (!isSafeTarget(finalUrl)) {
      return { ok: false, error: 'リダイレクト先が許可されないホストです（プライベート IP・メタデータ等）' }
    }
    if (!allowList.some((p) => finalUrl.startsWith(p))) {
      return { ok: false, error: 'リダイレクト先が許可リスト（ALLOWED_URL_PREFIXES）に含まれていません' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'リダイレクト検証に失敗しました' }
  }
}

async function handleCollect(env: Env, body: unknown, origin: string | null): Promise<Response> {
  const req = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const instruction = typeof req.instruction === 'string' ? req.instruction.trim() : ''
  let url: string | null = typeof req.url === 'string' ? req.url : null
  let action: Action | null = isAction(req.action) ? req.action : null

  if (!url || !action) {
    if (!instruction) {
      return json(
        { success: false, error: 'url と action、または instruction（自然言語指示）が必要です' },
        400,
        corsHeaders(env, origin)
      )
    }
    // LLM モードは指示文と URL が Workers AI へ送信されるため、明示的な同意を要求
    if (req.consent !== true) {
      return json(
        {
          success: false,
          error:
            'LLM モードでは consent: true が必要です。指示文と取得対象 URL が Workers AI に送信されます。個人情報・機密情報は送信しないでください。',
        },
        400,
        corsHeaders(env, origin)
      )
    }
    const parsed = await extractWithAI(env, instruction)
    url = parsed.url
    action = parsed.action
  }

  if (!url || !isValidUrl(url)) {
    return json({ success: false, error: 'url は https:// で始まる必要があります' }, 400, corsHeaders(env, origin))
  }

  // SSRF 対策: プライベート IP・メタデータ・特殊用途ホストを遮断
  if (!isSafeTarget(url)) {
    return json(
      { success: false, error: '収集対象として許可されないホストです（プライベート IP・メタデータ等）' },
      403,
      corsHeaders(env, origin)
    )
  }

  // 宛先許可リスト（明示的に設定されていなければ自プロジェクトのみ許可 = fail closed）
  const prefixes = allowedUrlPrefixes(env)
  const allowList = prefixes.length > 0 ? prefixes : DEFAULT_ALLOWED_PREFIXES
  if (!allowList.some((p) => url && url.startsWith(p))) {
    return json(
      { success: false, error: '指定された URL は許可リスト（ALLOWED_URL_PREFIXES）に含まれていません' },
      403,
      corsHeaders(env, origin)
    )
  }

  // リダイレクト先も許可リストと安全性を満たすことを検証（REDIRECT_CHECK=1 で有効化）
  const redirect = await redirectTargetOk(env, url, allowList)
  if (!redirect.ok) {
    return json({ success: false, error: redirect.error }, 403, corsHeaders(env, origin))
  }

  const waitUntil = typeof req.waitUntil === 'string' ? req.waitUntil : undefined
  try {
    const out = await runAction(env, action, url, waitUntil)
    return json(
      {
        success: true,
        action,
        url,
        title: out.title,
        contentType: out.contentType,
        result: out.result,
      },
      200,
      corsHeaders(env, origin)
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kitesurf の実行に失敗しました'
    return json({ success: false, error: message }, 502, corsHeaders(env, origin))
  }
}

async function handleSnapshot(env: Env, origin: string | null): Promise<Response> {
  if (!env.SNAPSHOTS) {
    return json({ success: false, error: 'KV namespace（SNAPSHOTS）が未設定です' }, 503, corsHeaders(env, origin))
  }
  const raw = await env.SNAPSHOTS.get('snapshot')
  if (!raw) {
    return json({ success: false, error: 'スナップショットがまだありません' }, 404, corsHeaders(env, origin))
  }
  let snapshot: unknown
  try {
    snapshot = JSON.parse(raw)
  } catch {
    snapshot = { raw }
  }
  return json({ success: true, ...(snapshot as Record<string, unknown>) }, 200, corsHeaders(env, origin))
}

// 呼出元 IP ごとの時間あたり利用量制限（KV カウンタ + TTL）
async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  if (!env.SNAPSHOTS) {
    return false
  }
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for') ||
    'unknown'
  const limit = parseInt(env.COLLECT_RATE_LIMIT || '30', 10) || 30
  const key = 'rate:' + ip + ':' + new Date().toISOString().slice(0, 13)
  const current = parseInt((await env.SNAPSHOTS.get(key)) || '0', 10) || 0
  if (current >= limit) {
    return true
  }
  await env.SNAPSHOTS.put(key, String(current + 1), { expirationTtl: 3600 })
  return false
}

async function handleCron(env: Env): Promise<void> {  const out = await runAction(env, 'markdown', DEFAULT_REPO_URL, 'networkidle2')
  const snapshot = {
    collectedAt: new Date().toISOString(),
    url: DEFAULT_REPO_URL,
    action: 'markdown',
    title: out.title || null,
    readmeMarkdown: typeof out.result === 'string' ? out.result : JSON.stringify(out.result),
  }
  if (env.SNAPSHOTS) {
    await env.SNAPSHOTS.put('snapshot', JSON.stringify(snapshot))
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) })
    }

    if (url.pathname === '/health') {
      return json(
        { ok: true, kitesurf: !!env.BROWSER, ai: !!env.AI, snapshot: !!env.SNAPSHOTS },
        200,
        corsHeaders(env, origin)
      )
    }

    if (url.pathname === '/snapshot') {
      return handleSnapshot(env, origin)
    }

    if (url.pathname === '/collect' && request.method === 'POST') {
      // 認証（fail closed）: COLLECTOR_TOKEN が未設定なら収集自体を無効化
      if (!env.COLLECTOR_TOKEN) {
        return json(
          { success: false, error: 'COLLECTOR_TOKEN が未設定のため収集は無効です' },
          503,
          corsHeaders(env, origin)
        )
      }
      const supplied = request.headers.get('x-collector-token')
      if (!supplied || !safeEqual(supplied, env.COLLECTOR_TOKEN)) {
        return json({ success: false, error: 'x-collector-token が不正です' }, 401, corsHeaders(env, origin))
      }
      if (await checkRateLimit(request, env)) {
        return json(
          { success: false, error: '利用量制限を超えました（時間あたりの上限）' },
          429,
          corsHeaders(env, origin)
        )
      }
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ success: false, error: 'JSON ボディが必要です' }, 400, corsHeaders(env, origin))
      }
      return handleCollect(env, body, origin)
    }

    return json({ success: false, error: 'Not found' }, 404, corsHeaders(env, origin))
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    try {
      await handleCron(env)
    } catch (e) {
      console.error('scheduled snapshot failed:', e instanceof Error ? e.message : e)
    }
  },
}