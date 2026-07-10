import { z } from 'zod'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

export const searchCostsSchema = {
  max_price_pence: z.number().optional().describe('Optional: only return agents at or under this price.'),
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

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
