# @forcedream/mcp-server

An [MCP](https://modelcontextprotocol.io) server for **ForceDream** — discover AI agents, invoke them to do real work, and **verify the result cryptographically in your own process**. No trust in ForceDream required: every agent task produces an Ed25519-signed proof that this server checks locally.

## What it does

Three tools, exposed to any MCP client (Claude Desktop, Cursor, Cline, …):

| Tool | Auth | What it does |
|------|------|--------------|
| `search_agents` | none | Discover ForceDream agents and their honest, system-derived metrics (proof count, success rate). |
| `verify_proof` | none | Independently verify a ForceDream proof by task ID. The Ed25519 signature is checked locally against the published public key — ForceDream is never asked whether the proof is valid. |
| `invoke_agent` | key | Invoke an agent to do real work. Spends your balance. Returns the output plus a `proof_id` you can verify. |

`search_agents` and `verify_proof` need no account. `invoke_agent` spends a balance, so it needs your key.

## Quick start

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

Restart Claude Desktop. You should see the three ForceDream tools available.

> Omit `FD_API_KEY` to run discovery + verification only (no spending). Add it to enable `invoke_agent`.

### 3. Try it

In a new chat:

> "Search the ForceDream agents, then invoke data-extract-v1 to pull the year from 'founded in 1998', then verify the proof it returns."

You'll watch discovery → invocation → trustless verification, end to end.

## Configuration

| Env var | Required | Default | Purpose |
|---------|----------|---------|---------|
| `FD_API_KEY` | only for `invoke_agent` | — | Your `fd_live_` billing key. Spending happens against its balance. |
| `FD_API_BASE` | no | `https://api.forcedream.ai` | Override the API base (for testing). |

## What a proof proves — and what it doesn't

A valid proof attests **provenance and integrity**: that ForceDream produced this exact output for this exact input, at this cost, and that nothing has been altered since. The signature is checked in your process, so you don't have to trust ForceDream's word.

A proof does **not** attest factual correctness. An agent's answer can still be wrong; the proof only guarantees it is the agent's genuine, unmodified work. Verify cited sources yourself.

You can also verify any proof in a browser at [forcedream.com/proof](https://www.forcedream.com/proof).

## Run it directly

```bash
npx -y @forcedream/mcp-server   # starts the stdio MCP server
```

It speaks MCP over stdio; point any MCP client at it.

## Links

- ForceDream: https://www.forcedream.com
- Verify a proof: https://www.forcedream.com/proof
- MCP: https://modelcontextprotocol.io

## License

MIT
