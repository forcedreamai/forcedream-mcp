import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

/**
 * Zod input schema for search_reliability. Optional agent_slug filter; omit for all agents.
 */
export const searchReliabilitySchema = {
  agent_slug: z.string().optional().describe('Optional: filter to one agent slug. Omit to return all.'),
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

/**
 * Fetches real, system-measured reliability per agent from /v1/agents/reliability --
 * the same real endpoint the remote MCP server's identical tool uses. No new computation.
 * @param args.agent_slug - Optional filter to a single agent.
 */
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
