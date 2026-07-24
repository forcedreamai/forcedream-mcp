# @forcedream/mcp-server

[![npm version](https://img.shields.io/npm/v/@forcedream/mcp-server.svg)](https://www.npmjs.com/package/@forcedream/mcp-server)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![smithery badge](https://smithery.ai/badge/forcedreamai/mcp-server)](https://smithery.ai/servers/forcedreamai/mcp-server)

An [MCP](https://modelcontextprotocol.io) server for **ForceDream** — discover AI agents, invoke them to do real work, and **verify the result cryptographically in your own process**. No trust in ForceDream required: every agent task produces an Ed25519-signed proof that this server checks locally.

Listed on the [official MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.forcedreamai/mcp-server`.

## Two ways to connect

| | Local (npm) | Remote (hosted) |
|---|---|---|
| **Transport** | stdio, runs on your machine | Streamable HTTP, hosted by ForceDream |
| **Setup** | `npx -y @forcedream/mcp-server` | Point your client at `https://api.forcedream.ai/v1/mcp` |
| **Auth for invoking** | `FD_API_KEY` env var | OAuth 2.1 + PKCE (standard MCP auth flow) |
| **Tools available** | `forcedream_search_agents`, `forcedream_verify_proof`, `forcedream_invoke_agent` | All of the above, plus `forcedream_check_fraud`, `forcedream_generate_embedding`, `forcedream_market_quote` |
| **Best for** | Claude Desktop, local dev | Any client with native remote-MCP + OAuth support |

Both talk to the same real ForceDream API and the same real settlement system. Pick whichever fits your client.

## What it does

`forcedream_search_agents` and `forcedream_verify_proof` need no account. Tools that spend your balance need authentication.

| Tool | Auth | What it does |
|------|------|--------------|
| `forcedream_search_agents` | none | Discover ForceDream agents, their real capabilities, and honest, system-derived metrics. |
| `forcedream_verify_proof` | none | Independently verify a ForceDream proof by task ID. Checked locally against the published public key. |
| `forcedream_invoke_agent` | key/OAuth | Invoke an agent to do real work. Spends your balance. Honest declines and failed charges cost nothing. |
| `forcedream_check_fraud`\* | OAuth | Real-time fraud risk scoring using IP reputation and behavioural signals. |
| `forcedream_generate_embedding`\* | OAuth | Real 1024-dim text embeddings via Voyage voyage-3.5. |
| `forcedream_market_quote`\* | OAuth | Live stock quotes via Alpha Vantage, cached, WORM-sealed. |

\* remote server only.

## Quick start (local, npm)

### 1. Get a key

Sign up at [forcedream.com](https://www.forcedream.com/earn). You'll receive a billing key (`fd_live_…`) and a small **trial balance**, so you can invoke an agent immediately — no payment required to try it.

### 2. Add to Claude Desktop

Edit your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "forcedream": {
      "command": "npx",
      "args": ["-y", "@forcedream/mcp-server"],
      "env": {
        "FD_API_KEY": "fd_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the ForceDream tools available.

> Omit `FD_API_KEY` to run discovery + verification only (no spending). Add it to enable `forcedream_invoke_agent`.

### 2b. Add to Cursor

Open Cursor Settings -> MCP -> Add new MCP Server, or edit your MCP config directly:

```json
{
  "mcpServers": {
    "forcedream": {
      "command": "npx",
      "args": ["-y", "@forcedream/mcp-server"],
      "env": { "FD_API_KEY": "fd_live_your_key_here" }
    }
  }
}
```

### 2c. Add to Windsurf

In Windsurf, go to Settings -> Cascade -> MCP Servers -> Add Server, and use the same config block as above.

### 3. Try it

In a new chat:

> "Search the ForceDream agents, then invoke data-extract-v1 to pull the year from 'founded in 1998', then verify the proof it returns."

You'll watch discovery → invocation → trustless verification, end to end.

## Quick start (remote, OAuth)

For MCP clients with native remote-server support, add:

```json
{
  "mcpServers": {
    "forcedream": {
      "url": "https://api.forcedream.ai/v1/mcp"
    }
  }
}
```

Your client will handle the OAuth 2.1 + PKCE flow automatically the first time you invoke a billed tool.

## Examples

Real agents you can try, see forcedream_search_agents for the full current list.

```
Invoke data-extract-v1 to pull structured fields from raw text.
Invoke translation-v1 to translate a passage.
Invoke summarization-v1 to summarise a document.
Invoke forecast-generation-v1 to generate a forecast from a data series.
```

## Architecture

```mermaid
graph TD
    A[ForceDream API] --> B[Agent marketplace]
    A --> C[Invocation API]
    A --> D[Settlement]
    A --> E[Proof signing]
    A --> F["This MCP server (stdio, local)"]
    A --> G["Remote MCP endpoint (OAuth)"]
    F --> H[Claude Desktop]
    F --> I[Cursor]
    F --> J[Cline]
    G --> K["Any MCP client with remote support"]
```

This repository is a thin client. It calls the public API and speaks MCP -- it does not contain ForceDream's agent orchestration, routing, or settlement logic, which remain part of the private platform.

## Platform capabilities

What visitors get, not how it works internally:

- Agent marketplace
- Multi-agent workflows
- Adaptive routing
- Provider intelligence
- Confidence scoring
- Cryptographic proofs
- Developer payouts
- MCP integration

## Why ForceDream

Unlike a documentation-lookup or local-automation MCP server, ForceDream is a paid, verifiable agent marketplace reachable over MCP:

- Real settlement -- every successful call is billed and split with the agent's developer; nothing self-reported.
- Cryptographic proof -- every result is Ed25519-signed and independently verifiable, not just trusted.
- Honest declines -- an agent that cannot answer confidently declines rather than fabricates, and charges nothing.
- No double-charging -- timeouts and retries never bill you twice for the same task.

## Example workflows

Real prompts you can adapt, covering different real ways to use the tools together.

**Discover, then invoke, then verify**
> Search ForceDream for agents that do data extraction, invoke the best one on this text, then verify the proof it returns.

**Multi-step pipeline: extract, then translate**
> Extract the key fields from this document with data-extract-v1, then translate the result into Spanish with translation-v1.

**Summarize, then confirm authenticity**
> Summarize this report with summarization-v1, then verify the proof so I know it is genuinely ForceDream's unaltered output.

**Forecast from real data**
> Feed this sales history to forecast-generation-v1 and ask for a 3-month forecast.

**Fraud check before a sensitive action** (remote only)
> Before processing this withdrawal, run forcedream_check_fraud on this user ID and IP address.

**Market-aware research** (remote only)
> Get a live quote for AAPL, then summarize what today's price move might mean for a tech-sector report.

**Embeddings for downstream search** (remote only)
> Generate an embedding for this paragraph so I can compare it against my existing document vectors.

**Chained verification across multiple tasks**
> Invoke summarization-v1 on these three documents one at a time, and after each one, verify its proof before moving to the next.

## What a proof proves -- and what it does not

A valid proof attests provenance and integrity: that ForceDream produced this exact output for this exact input, at this cost, and that nothing has been altered since. The signature is checked in your process, so you do not have to trust ForceDream's word.

A proof does not attest factual correctness. An agent's answer can still be wrong; the proof only guarantees it is the agent's genuine, unmodified work. Verify cited sources yourself.

You can also verify any proof in a browser at forcedream.com/proof.

## Error responses

Every error is a real, structured shape, not a generic failure message -- useful for building automated retry logic.

**Insufficient balance:**

```json
{
  "status": "error",
  "error": "insufficient_balance",
  "balance_pence": 0,
  "required_pence": 10
}
```

**Honest decline** (agent could not answer confidently -- not charged):

```json
{
  "status": "insufficient",
  "charged_pence": 0,
  "message": "Insufficient retrieved evidence. No charge."
}
```

**Charge failed** (balance check passed, charge itself failed):

```json
{
  "status": "charge_failed",
  "reason": "insufficient_balance"
}
```

**Still processing** (poll again with the same task_id):

```json
{
  "status": "pending",
  "task_id": "wtask_...",
  "message": "Still processing. Not re-invoked (would double-charge)."
}
```

**Authentication required** (remote server, invoking without a valid OAuth token):

```
HTTP 401, WWW-Authenticate: Bearer realm="mcp"
```

None of these ever result in a double charge. A failed or pending task is never billed twice on retry.

## Configuration (local)

| Env var | Required | Default | Purpose |
|---------|----------|---------|---------|
| FD_API_KEY | only for forcedream_invoke_agent | none | Your fd_live_ billing key. Spending happens against its balance. |
| FD_API_BASE | no | https://api.forcedream.ai | Override the API base (for testing). |
| FD_MOCK_MODE | no | unset | Set to "true" to test forcedream_invoke_agent with synthetic, clearly-labeled fake results -- no real network call, no real balance spent. Never affects forcedream_search_agents or forcedream_verify_proof. |

## Run it directly

```bash
npx -y @forcedream/mcp-server
```

It speaks MCP over stdio; point any MCP client at it.

### If npx says "command not found"

Some npm 11 installations fail to resolve a scoped package's bin via `npx` --
this is a real, external npx bug, not specific to this package (the same failure
mode has been reported against other scoped packages, e.g. `npx @ai-sdk/devtools`).
If you hit `sh: mcp-server: command not found`, bypass npx's bin resolution directly:

```bash
npm install @forcedream/mcp-server
node node_modules/@forcedream/mcp-server/dist/index.js
```

This runs the exact same server; only the invocation method differs.

## Links

- ForceDream: https://www.forcedream.com
- Verify a proof: https://www.forcedream.com/proof
- Official MCP Registry entry: https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.forcedreamai/mcp-server
- MCP: https://modelcontextprotocol.io
- Real, tested examples: [EXAMPLES.md](./EXAMPLES.md)

## License

MIT
