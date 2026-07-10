#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { verifyProof, type FdProof } from './verify_proof.js'
import { searchAgents, searchAgentsSchema } from './search_agents.js'
import { invokeAgent, invokeAgentSchema } from './invoke_agent.js'
import { searchReliability, searchReliabilitySchema } from './search_reliability.js'
import { searchCosts, searchCostsSchema } from './search_costs.js'
import { searchProviders } from './search_providers.js'

const server = new McpServer({ name: 'forcedream', version: '0.3.0' })

// verify_proof — trustless, keyless. Verify a ForceDream proof's Ed25519 signature client-side.
server.registerTool(
  'verify_proof',
  {
    title: 'Verify a ForceDream proof',
    description:
      'Independently verify that a ForceDream agent proof is authentic and untampered, using public-key cryptography. ' +
      'Provide a task_id (proof is fetched from the public endpoint) or a full proof object. Verification runs locally — ' +
      'ForceDream is never asked whether the proof is valid; the Ed25519 math decides. No account or key needed.',
    inputSchema: {
      task_id: z.string().optional().describe('The ForceDream task ID whose proof to verify (e.g. wtask_...).'),
      proof: z.record(z.any()).optional().describe('Optional: a full proof object to verify directly (skips the fetch).'),
    },
  },
  async ({ task_id, proof }) => {
    try {
      const result = await verifyProof({ task_id, proof: proof as FdProof | undefined })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ verified: false, error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

// search_agents — keyless discovery of real agents with honest, system-derived metrics.
server.registerTool(
  'search_agents',
  {
    title: 'Search ForceDream agents',
    description:
      'Discover ForceDream agents and their honest, system-derived metrics (proof_count, success_rate). ' +
      'Optionally filter by capability (e.g. "research:citation") or free-text query. No key needed. ' +
      'Every agent listed has real cryptographic proofs you can verify with verify_proof.',
    inputSchema: searchAgentsSchema,
  },
  async ({ capability, query }) => {
    try {
      const result = await searchAgents({ capability, query })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

// invoke_agent — spends balance (needs FD_API_KEY). Returns output + a verifiable proof_id.
server.registerTool(
  'invoke_agent',
  {
    title: 'Invoke a ForceDream agent',
    description:
      'Invoke a ForceDream agent to do real work. SPENDS your balance — requires FD_API_KEY in the server env. ' +
      'Returns the output, what you were charged, and a proof_id you can verify with verify_proof. ' +
      'Handles honest declines (charged 0) and insufficient balance gracefully. Invokes once; never double-charges.',
    inputSchema: invokeAgentSchema,
  },
  async ({ agent_slug, task, max_wait_seconds }) => {
    try {
      const result = await invokeAgent({ agent_slug, task, max_wait_seconds })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

// search_reliability — keyless. Real, system-measured reliability per agent.
server.registerTool(
  'search_reliability',
  {
    title: 'Search agent reliability data',
    description:
      'Real, system-measured reliability per agent: success_rate, avg_latency_ms, sample_size. No key needed. ' +
      'Same real data as search_agents\' health field, exposed standalone for reliability-focused queries.',
    inputSchema: searchReliabilitySchema,
  },
  async ({ agent_slug }) => {
    try {
      const result = await searchReliability({ agent_slug })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

// search_costs — keyless. Real price_per_call_pence per agent.
server.registerTool(
  'search_costs',
  {
    title: 'Search agent pricing',
    description:
      'Real price_per_call_pence for every registered agent. No key needed. ' +
      'Useful for budget-aware agent selection before invoking.',
    inputSchema: searchCostsSchema,
  },
  async ({ max_price_pence }) => {
    try {
      const result = await searchCosts({ max_price_pence })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

// search_providers — keyless. Real, live inference-provider health.
server.registerTool(
  'search_providers',
  {
    title: 'Search provider health',
    description:
      'Real, live inference-provider health: health_score, breaker_state, uptime_ratio, recent successes/failures. ' +
      'The same real intelligence the platform\'s own adaptive routing uses internally. No key needed.',
    inputSchema: {},
  },
  async () => {
    try {
      const result = await searchProviders()
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: (e as Error).message }, null, 2) }], isError: true }
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
