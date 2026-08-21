import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

function authHeader(): Record<string, string> {
  const key = process.env.FD_API_KEY || ''
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function postJson(url: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) })
  let json: any = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

// --- forcedream_check_fraud ---

export const checkFraudSchema = {
  ip: z.string().optional().describe('Optional IP address to check against AbuseIPDB reputation data.'),
}

interface CheckFraudResult {
  status: 'completed' | 'error'
  risk_score?: number
  signals?: Record<string, boolean>
  verdict?: 'allow' | 'review' | 'block'
  ip_reputation?: { abuseipdb_score: number | null; reports?: number }
  worm_seal?: string
  message?: string
  mock?: true
}

/**
 * Real, direct fraud risk assessment -- a single, synchronous call, no polling. SPENDS
 * your balance -- requires FD_API_KEY. Uses real AbuseIPDB reputation data when an IP is
 * provided.
 * @param args.ip - Optional IP address to check.
 */
export async function checkFraud(args: { ip?: string }): Promise<CheckFraudResult> {
  if (process.env.FD_MOCK_MODE === 'true') {
    return { status: 'completed', risk_score: 0, signals: {}, verdict: 'allow', ip_reputation: { abuseipdb_score: null }, mock: true, message: 'MOCK MODE ACTIVE (FD_MOCK_MODE=true): no real balance was spent, no real AbuseIPDB lookup was made.' }
  }
  if (!process.env.FD_API_KEY) {
    return { status: 'error', message: 'FD_API_KEY is required. Get a free key with trial credit at https://forcedream.com/earn (no card required) and set FD_API_KEY in the MCP server env. forcedream_search_agents and forcedream_verify_proof stay free and need no key.' }
  }
  const res = await postJson(`${FD_API}/v1/tools/check-fraud`, { ip: args.ip || '' })
  if (res.status === 401) return { status: 'error', message: 'Invalid FD_API_KEY (401).' }
  if (res.status === 402) return { status: 'error', message: `Insufficient balance: ${JSON.stringify(res.json)}` }
  if (res.status !== 200 || !res.json) return { status: 'error', message: `Request failed (HTTP ${res.status}): ${JSON.stringify(res.json)}` }
  return { status: 'completed', ...res.json }
}

// --- forcedream_generate_embedding ---

export const generateEmbeddingSchema = {
  text: z.string().describe('Text to embed (max ~32000 chars).'),
  input_type: z.string().optional().describe('Optional: "query" or "document".'),
}

interface EmbeddingResult {
  status: 'completed' | 'error'
  dimensions?: number
  tokens?: number
  embedding?: number[]
  cost_pence?: number
  worm_seal?: string
  message?: string
  mock?: true
}

/**
 * Real, direct text embedding via Voyage voyage-3.5 -- a single, synchronous call, no
 * polling. SPENDS your balance (per-token charge) -- requires FD_API_KEY.
 * @param args.text - Text to embed.
 * @param args.input_type - Optional "query" or "document".
 */
export async function generateEmbedding(args: { text: string; input_type?: string }): Promise<EmbeddingResult> {
  if (process.env.FD_MOCK_MODE === 'true') {
    return { status: 'completed', dimensions: 1024, tokens: 0, embedding: [], cost_pence: 0, mock: true, message: 'MOCK MODE ACTIVE (FD_MOCK_MODE=true): no real balance was spent, no real embedding was generated.' }
  }
  if (!process.env.FD_API_KEY) {
    return { status: 'error', message: 'FD_API_KEY is required. Get a free key with trial credit at https://forcedream.com/earn (no card required) and set FD_API_KEY in the MCP server env. forcedream_search_agents and forcedream_verify_proof stay free and need no key.' }
  }
  const res = await postJson(`${FD_API}/v1/embeddings`, { text: args.text, input_type: args.input_type })
  if (res.status === 401) return { status: 'error', message: 'Invalid FD_API_KEY (401).' }
  if (res.status !== 200 || !res.json) return { status: 'error', message: `Request failed (HTTP ${res.status}): ${JSON.stringify(res.json)}` }
  return { status: 'completed', ...res.json }
}

// --- forcedream_market_quote ---

export const marketQuoteSchema = {
  symbol: z.string().describe('Ticker symbol, e.g. "AAPL", "IBM".'),
}

interface MarketQuoteResult {
  status: 'completed' | 'error'
  symbol?: string
  price?: number
  change_percent?: number
  volume?: number
  day_high?: number
  day_low?: number
  liquidity_score?: number
  worm_seal?: string
  message?: string
  mock?: true
}

/**
 * Real, direct, live market quote via Alpha Vantage -- a single, synchronous call, no
 * polling. SPENDS your balance -- requires FD_API_KEY. Hard-cached server-side.
 * @param args.symbol - Ticker symbol, e.g. "AAPL".
 */
export async function marketQuote(args: { symbol: string }): Promise<MarketQuoteResult> {
  if (process.env.FD_MOCK_MODE === 'true') {
    return { status: 'completed', symbol: args.symbol, price: 0, change_percent: 0, volume: 0, mock: true, message: 'MOCK MODE ACTIVE (FD_MOCK_MODE=true): no real balance was spent, no real market data was fetched.' }
  }
  if (!process.env.FD_API_KEY) {
    return { status: 'error', message: 'FD_API_KEY is required. Get a free key with trial credit at https://forcedream.com/earn (no card required) and set FD_API_KEY in the MCP server env. forcedream_search_agents and forcedream_verify_proof stay free and need no key.' }
  }
  const res = await postJson(`${FD_API}/v1/tools/market-quote`, { symbol: args.symbol })
  if (res.status === 401) return { status: 'error', message: 'Invalid FD_API_KEY (401).' }
  if (res.status === 402) return { status: 'error', message: `Insufficient balance: ${JSON.stringify(res.json)}` }
  if (res.status !== 200 || !res.json) return { status: 'error', message: `Request failed (HTTP ${res.status}): ${JSON.stringify(res.json)}` }
  return { status: 'completed', ...res.json }
}
