import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

export interface AgentMetrics {
  proof_count?: number
  tasks_completed?: number
  tasks_attempted?: number
  success_rate?: number
  revenue_earned_pence?: number
  avg_cost_pence?: number
}

export interface AgentReliability {
  success_rate: number
  avg_latency_ms: number
  sample_size: number
  note: string | null
}

export interface Agent {
  slug: string
  name: string
  version?: string
  capabilities: string[]
  price_per_call_pence?: number
  metrics?: AgentMetrics
  health?: AgentReliability | null
}

export const searchAgentsSchema = {
  capability: z.string().optional().describe('Optional capability filter (e.g. "research:citation"). Omit to return all.'),
  query: z.string().optional().describe('Optional free-text match against agent slug/name/capability.'),
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

// Discover ForceDream agents. Keyless (public registry). Honest system-derived metrics only.
// Server has no working capability filter -> filter client-side.
// Real health telemetry addition: merges in /v1/agents/reliability (a real, separate, already-live
// endpoint) rather than inventing any new health computation -- matching the identical fix
// already made to the remote MCP server's own mcpSearchAgents. A reliability-fetch failure never
// blocks the core listing; health is honestly null where no real reliability data exists yet.
export async function searchAgents(args: { capability?: string; query?: string }): Promise<{
  count: number
  agents: Array<Agent & { verify_proofs: string; invoke: string }>
  note: string
}> {
  const [data, relData] = await Promise.all([
    fetchJson(`${FD_API}/v1/agents/list`),
    fetchJson(`${FD_API}/v1/agents/reliability`).catch(() => null),
  ])
  let agents: Agent[] = Array.isArray(data?.agents) ? data.agents : []

  const reliabilityBySlug: Record<string, AgentReliability> = {}
  if (relData && Array.isArray(relData.agents)) {
    for (const ra of relData.agents) {
      if (ra.agent_slug) reliabilityBySlug[ra.agent_slug] = ra.reliability
    }
  }

  if (args.capability) {
    const cap = args.capability.toLowerCase()
    agents = agents.filter((a) => (a.capabilities || []).some((c) => c.toLowerCase() === cap))
  }
  if (args.query) {
    const q = args.query.toLowerCase()
    agents = agents.filter(
      (a) =>
        a.slug.toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.capabilities || []).some((c) => c.toLowerCase().includes(q))
    )
  }

  const enriched = agents.map((a) => ({
    ...a,
    health: reliabilityBySlug[a.slug] || null,
    verify_proofs: `${FD_API}/v1/agents/${a.slug}/proofs`,
    invoke: `${FD_API}/v1/agents/${a.slug}/invoke`,
  }))

  return {
    count: enriched.length,
    agents: enriched,
    note:
      enriched.length === 0
        ? 'No agents matched. The registry contains only real, registered agents with cryptographic proofs.'
        : 'Metrics are system-derived from proofs/ledger (proof_count, success_rate) — never self-reported. Health (success_rate, avg_latency_ms, sample_size) is honestly null where no real reliability data exists yet. Each agent\'s proofs are independently verifiable.',
  }
}
