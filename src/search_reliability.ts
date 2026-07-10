import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

export const searchReliabilitySchema = {
  agent_slug: z.string().optional().describe('Optional: filter to one agent slug. Omit to return all.'),
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

// Real, system-measured reliability per agent. Same real endpoint the remote MCP server uses.
export async function searchReliability(args: { agent_slug?: string }): Promise<any> {
  const data = await fetchJson(`${FD_API}/v1/agents/reliability`)
  let agents: any[] = Array.isArray(data?.agents) ? data.agents : []
  if (args.agent_slug) agents = agents.filter((a) => a.agent_slug === args.agent_slug)
  return {
    count: agents.length,
    agents,
    note: 'Real, system-measured reliability -- success_rate, avg_latency_ms, sample_size. Never self-reported.',
  }
}
