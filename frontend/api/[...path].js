// Vercel serverless catch-all proxy for /api/*.
//
// Why this exists: the backend lives on alwaysdata shared hosting, and
// alwaysdata's own front-end proxy ("alproxy") rejects any POST/PATCH/PUT/
// DELETE request that carries a browser-supplied `Origin` header with a
// synthetic 500 `{"message":"Internal server error"}` — before the request
// ever reaches our Express app. GET requests don't carry an Origin header
// from most browsers, which is why reads worked and writes didn't.
//
// The fix: the browser talks same-origin to Vercel (this function), and
// this function makes its own server-to-server fetch() to alwaysdata.
// A server-to-server fetch never has a browser-set Origin header, so
// alwaysdata's proxy lets it through normally.
//
// This replaces the old `rewrites` entry in vercel.json that sent
// /api/(.*) directly to alwaysdata (which forwarded the browser's Origin
// header as-is and hit the proxy bug).

export const config = {
  api: {
    bodyParser: false,
  },
}

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'https://discord-bot-ayman.alwaysdata.net'

// Hop-by-hop headers must never be forwarded (per RFC 7230 6.1), plus
// `host` (would point at alwaysdata's own vhost matching, not ours) and
// `origin` (the entire point of this proxy is to not forward it).
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
])

const STRIP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
  'content-length',
])

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  const { path } = req.query
  const segments = Array.isArray(path) ? path : path ? [path] : []
  const targetPath = '/api/' + segments.map(encodeURIComponent).join('/')

  const url = new URL(targetPath, BACKEND_ORIGIN)
  const incomingUrl = new URL(req.url, 'http://internal')
  url.search = incomingUrl.search

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  // No Origin header is set here — that's the entire fix. We also don't
  // set one from the request; alwaysdata's proxy only chokes when one is
  // present at all.

  const hasBody = !['GET', 'HEAD'].includes(req.method ?? 'GET')
  const body = hasBody ? await readRawBody(req) : undefined

  let upstream
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      redirect: 'manual',
    })
  } catch (err) {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ message: 'Upstream request failed' }))
    console.error('proxy upstream error', err)
    return
  }

  res.statusCode = upstream.status

  // Node's fetch Headers collapses multiple Set-Cookie into one entry
  // via a special-cased getSetCookie() — must use that to preserve
  // multiple cookies (e.g. session + CSRF) instead of merging them.
  const setCookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : []
  if (setCookies.length > 0) {
    res.setHeader('set-cookie', setCookies)
  }

  for (const [key, value] of upstream.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') continue
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue
    res.setHeader(key, value)
  }

  const responseBody = Buffer.from(await upstream.arrayBuffer())
  res.end(responseBody)
}
