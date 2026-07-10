const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

/**
 * Fetches real, live inference-provider health from /v1/intelligence/status --
 * the same intelligence the platform's own adaptive routing uses internally.
 */
export async function searchProviders(): Promise<any> {
  const data = await fetchJson(`${FD_API}/v1/intelligence/status`)
  const providers: any[] = Array.isArray(data?.providers) ? data.providers : []
  return {
    count: providers.length,
    providers,
    note: 'Real, live provider health -- the same intelligence the platform\'s own adaptive routing uses internally.',
  }
}
