import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'
const SLUG = 'security-scan-v1'

/**
 * Zod input schema for the forcedream_security_scan tool. code is required;
 * max_wait_seconds bounds how long this call polls before returning a pollable task_id.
 * A dedicated, named tool for ForceDream's security-scan-v1 agent, rather than requiring
 * a caller to know the generic forcedream_invoke_agent + agent_slug pattern.
 */
export const securityScanSchema = {
  code: z.string().describe('The code to scan for security vulnerabilities (OWASP Top 10, injection, secrets, dependency risks).'),
  max_wait_seconds: z.number().optional().describe('Max seconds to poll (default 60, agent typically takes ~45s). On timeout, returns task_id to poll later.'),
}

interface SecurityScanResult {
  status: 'completed' | 'insufficient' | 'charge_failed' | 'pending' | 'error'
  agent: string
  task_id?: string
  output?: unknown
  charged_pence?: number
  proof_id?: string
  verify_proof_hint?: string
  message: string
  mock?: true
}

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

async function getJson(url: string): Promise<{ status: number; json: any }> {
  const res = await fetch(url, { headers: authHeader() })
  let json: any = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Invoke security-scan-v1 and wait (bounded) for the result. SPENDS balance -- needs FD_API_KEY.
// Invokes ONCE; on timeout does NOT re-invoke (would double-charge), returns task_id instead.
// Same real invoke/poll pattern as forcedream_invoke_agent, fixed to this one, specific agent.
/**
 * Invokes ForceDream's real security-scan-v1 agent and polls (bounded) for the result.
 * SPENDS your balance -- requires FD_API_KEY. Invokes once; never re-invokes on timeout
 * (would double-charge) -- returns a pollable task_id instead. Set FD_MOCK_MODE=true to
 * test without spending real balance.
 * @param args.code - The code to scan.
 * @param args.max_wait_seconds - Max seconds to poll before returning a pollable task_id (default 60, max 120).
 */
export async function securityScan(args: { code: string; max_wait_seconds?: number }): Promise<SecurityScanResult> {
  // Mock mode: explicit opt-in only, never a default. Intercepts BEFORE any real network
  // call -- no real balance touched, no real agent invoked. Same discipline as invoke_agent.ts.
  if (process.env.FD_MOCK_MODE === 'true') {
    return {
      status: 'completed',
      agent: SLUG,
      task_id: 'mock_' + Date.now(),
      output: { mock: true, findings: [], risk_score: 0, note: 'Synthetic mock output. This is not a real scan result.' },
      charged_pence: 0,
      mock: true,
      message: 'MOCK MODE ACTIVE (FD_MOCK_MODE=true): no real scan was run, no balance was spent, and this response has no real proof_id -- forcedream_verify_proof will correctly reject it if you try. Unset FD_MOCK_MODE to run real scans.',
    }
  }
  if (!process.env.FD_API_KEY) {
    return { status: 'error', agent: SLUG, message: 'FD_API_KEY is required to scan (scanning spends your balance). Set it in the MCP server env. forcedream_search_agents and forcedream_verify_proof need no key.' }
  }
  const maxWaitMs = Math.max(5, Math.min(120, args.max_wait_seconds ?? 60)) * 1000

  const inv = await postJson(`${FD_API}/v1/agents/${SLUG}/invoke`, { task: args.code })
  if (inv.status === 401) return { status: 'error', agent: SLUG, message: 'Invalid FD_API_KEY (401). Check the key in the MCP server env.' }
  if (!inv.json?.task_id) return { status: 'error', agent: SLUG, message: `Invoke failed (HTTP ${inv.status}): ${inv.json?.error || inv.json?.note || 'no task_id'}` }
  const taskId: string = inv.json.task_id

  const start = Date.now()
  let intervalMs = 2500
  while (Date.now() - start < maxWaitMs) {
    await sleep(intervalMs)
    const poll = await getJson(`${FD_API}/v1/agents/${SLUG}/result/${encodeURIComponent(taskId)}`)
    const d = poll.json || {}
    const status = d.status || d.outcome

    if (status === 'completed' || status === 'succeeded' || d.ok === true) {
      return {
        status: 'completed', agent: SLUG, task_id: taskId, output: d.output, charged_pence: d.charged_pence,
        proof_id: d.proof_id || taskId,
        verify_proof_hint: `Verify trustlessly: call forcedream_verify_proof with task_id "${d.proof_id || taskId}". The signature proves authenticity without trusting ForceDream.`,
        message: `Completed. Charged ${d.charged_pence}p. Cryptographically proven (proof_id ${d.proof_id || taskId}).`,
      }
    }
    if (status === 'charge_failed') return { status: 'charge_failed', agent: SLUG, task_id: taskId, charged_pence: 0, message: `Charge failed: ${d.reason || 'insufficient_balance'}. Nothing charged or delivered. Top up and retry.` }
    if (status === 'failed' || status === 'dead_letter') return { status: 'error', agent: SLUG, task_id: taskId, message: `Task ${status}: ${d.reason || d.last_error || 'unknown'}` }
    intervalMs = Math.min(intervalMs + 1000, 6000)
  }
  return { status: 'pending', agent: SLUG, task_id: taskId, message: `Still processing after ${maxWaitMs / 1000}s. Not re-invoked (would double-charge). Poll the result later with this task_id.` }
}
