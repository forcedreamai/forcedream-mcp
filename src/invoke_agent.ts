import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

export const invokeAgentSchema = {
  agent_slug: z.string().describe('The agent to invoke, e.g. "atlas-research-v1". Use search_agents to discover.'),
  task: z.string().describe('The task/query for the agent (Atlas: a research question).'),
  max_wait_seconds: z.number().optional().describe('Max seconds to poll (default 60). On timeout, returns task_id to poll later.'),
}

interface InvokeResult {
  status: 'completed' | 'insufficient' | 'charge_failed' | 'pending' | 'error'
  agent: string
  task_id?: string
  output?: unknown
  charged_pence?: number
  proof_id?: string
  verify_proof_hint?: string
  message: string
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

// Invoke a ForceDream agent and wait (bounded) for the result. SPENDS balance — needs FD_API_KEY.
// Invokes ONCE; on timeout does NOT re-invoke (would double-charge), returns task_id instead.
export async function invokeAgent(args: { agent_slug: string; task: string; max_wait_seconds?: number }): Promise<InvokeResult> {
  if (!process.env.FD_API_KEY) {
    return { status: 'error', agent: args.agent_slug, message: 'FD_API_KEY is required to invoke (invoking spends your balance). Set it in the MCP server env. search_agents and verify_proof need no key.' }
  }
  const slug = args.agent_slug
  const maxWaitMs = Math.max(5, Math.min(120, args.max_wait_seconds ?? 60)) * 1000

  const inv = await postJson(`${FD_API}/v1/agents/${encodeURIComponent(slug)}/invoke`, { task: args.task })
  if (inv.status === 401) return { status: 'error', agent: slug, message: 'Invalid FD_API_KEY (401). Check the key in the MCP server env.' }
  if (!inv.json?.task_id) return { status: 'error', agent: slug, message: `Invoke failed (HTTP ${inv.status}): ${inv.json?.error || inv.json?.note || 'no task_id'}` }
  const taskId: string = inv.json.task_id

  const start = Date.now()
  let intervalMs = 2500
  while (Date.now() - start < maxWaitMs) {
    await sleep(intervalMs)
    const poll = await getJson(`${FD_API}/v1/agents/${encodeURIComponent(slug)}/result/${encodeURIComponent(taskId)}`)
    const d = poll.json || {}
    const status = d.status || d.outcome

    if (status === 'completed' || status === 'succeeded' || d.ok === true) {
      if (d.outcome === 'insufficient' || (d.output && (d.output as any).confidence === 'insufficient')) {
        return { status: 'insufficient', agent: slug, task_id: taskId, output: d.output, charged_pence: 0, message: 'Agent returned insufficient evidence and declined rather than fabricate. Charged nothing.' }
      }
      return {
        status: 'completed', agent: slug, task_id: taskId, output: d.output, charged_pence: d.charged_pence,
        proof_id: d.proof_id || taskId,
        verify_proof_hint: `Verify trustlessly: call verify_proof with task_id "${d.proof_id || taskId}". The signature proves authenticity without trusting ForceDream.`,
        message: `Completed. Charged ${d.charged_pence}p. Cryptographically proven (proof_id ${d.proof_id || taskId}).`,
      }
    }
    if (status === 'insufficient') return { status: 'insufficient', agent: slug, task_id: taskId, output: d.output, charged_pence: 0, message: 'Agent declined (insufficient evidence). Charged nothing.' }
    if (status === 'charge_failed') return { status: 'charge_failed', agent: slug, task_id: taskId, charged_pence: 0, message: `Charge failed: ${d.reason || 'insufficient_balance'}. Nothing charged or delivered. Top up and retry.` }
    if (status === 'failed' || status === 'dead_letter') return { status: 'error', agent: slug, task_id: taskId, message: `Task ${status}: ${d.reason || d.last_error || 'unknown'}` }
    intervalMs = Math.min(intervalMs + 1000, 6000)
  }
  return { status: 'pending', agent: slug, task_id: taskId, message: `Still processing after ${maxWaitMs / 1000}s. Not re-invoked (would double-charge). Poll the result later with this task_id.` }
}
