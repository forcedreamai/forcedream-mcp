import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

/**
 * Zod input schema for forcedream_search_costs. Optional max_price_pence filter for budget-aware selection.
 */
export const searchCostsSchema = {
  max_price_pence: z.number().optional().describe('Optional: only return agents at or under this price.'),
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

/**
 * Fetches real price_per_call_pence for every registered agent from /v1/agents/list.
 * @param args.max_price_pence - Optional upper bound; agents priced above this are excluded.
 */
export async function searchCosts(args: { max_price_pence?: number }): Promise<any> {
  const data = await fetchJson(`${FD_API}/v1/agents/list`)
  const agents: any[] = Array.isArray(data?.agents) ? data.agents : []
  let priced = agents.map((a) => ({ slug: a.slug, name: a.name, price_per_call_pence: a.price_per_call_pence }))
  if (typeof args.max_price_pence === 'number') {
    const cap = args.max_price_pence
    priced = priced.filter((a) => (a.price_per_call_pence ?? Infinity) <= cap)
  }
  return {
    count: priced.length,
    agents: priced,
    note: 'Real price_per_call_pence per agent, useful for budget-aware selection before invoking.',
  }
}
