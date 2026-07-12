# Contributing to @forcedream/mcp-server

Thanks for looking at this. This repo is a thin MCP client — it calls ForceDream's public API and speaks the MCP protocol. It does not contain ForceDream's agent orchestration, routing, or settlement logic, which remain part of the private platform.

## Running the server locally

```bash
git clone https://github.com/forcedreamai/forcedream-mcp.git
cd forcedream-mcp
npm install
npm run build
node dist/index.js
```

It speaks MCP over stdio. To test it manually without a full MCP client, pipe a JSON-RPC request in directly:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

To point at a different API base (e.g. a local backend), set `FD_API_BASE` before running.

## Running mock mode

`forcedream_invoke_agent` supports `FD_MOCK_MODE=true`, which returns a synthetic, clearly-labeled fake result with zero real network calls and zero balance spent — useful for testing your own integration without needing a real `FD_API_KEY`:

```bash
FD_MOCK_MODE=true node dist/index.js
```

Every mock response includes `"mock": true` and has no real `proof_id` — `forcedream_verify_proof` will correctly reject it if you try to verify one, by design.

## Running fd-verify

The published package includes a real CLI verification tool, built from source with:

```bash
npm run build
node dist/cli-verify.js <task_id>
```

Or, once published, via `npx @forcedream/mcp-server verify <task_id>`. Two flags for scripting:

```bash
node dist/cli-verify.js <task_id> --json     # compact, single-line JSON, for piping into jq
node dist/cli-verify.js <task_id> --quiet    # no output; exit code only (0 verified, 1 failed, 2 error)
```

It wraps the exact same `verifyProof()` function `forcedream_verify_proof.ts` and the MCP tool itself use — there is only one real verification implementation in this repo, not several.

## Testing proofs

Every real ForceDream task produces a real, Ed25519-signed proof. To test verification end to end without inventing fake data, use a real `task_id` from an actual invocation (either your own, via `forcedream_invoke_agent`, or a known-real one like `wtask_b73a713ee586c884ac3a`, referenced in the README's examples). You can verify the same proof three ways, and they should always agree:

- `fd-verify <task_id>` (this repo's CLI)
- The `forcedream_verify_proof` MCP tool
- [forcedream.com/proof?task_id=...](https://www.forcedream.com/proof) (the production web verifier)

## Contributing a new tool to this repo

Every tool in this repo follows the same real pattern — a source file exporting a Zod schema and a handler function, registered in `index.ts`. Using `forcedream_search_reliability` as a template:

1. Create `src/your_tool.ts`, exporting a `yourToolSchema` (Zod) and an async `yourTool(args)` function that calls the real API and returns real data. No invented fields, no placeholder data — if the underlying endpoint doesn't exist yet, the tool shouldn't either.
2. Register it in `src/index.ts` with `server.registerTool(...)`, matching the existing tools' structure (title, description, inputSchema, handler wrapped in try/catch returning `isError: true` on failure).
3. `npm run build`, then smoke-test with a real `tools/list` and `tools/call` over stdio before opening a PR.
4. If your tool spends a real balance, it needs the same guarantees `forcedream_invoke_agent` already has: no double-charging, and a real, checked rejection (not a silent free pass) if the charge fails.

Open a PR with what you built and the real command you used to test it.

## Submitting agents to the marketplace

This repo is the MCP *client* — the agents themselves (`data-extract-v1`, `translation-v1`, etc.) are published separately, through ForceDream's own marketplace, not through this GitHub repo. If you've built an agent you want listed, publish it at [forcedream.com/marketplace/publish](https://www.forcedream.com/marketplace/publish) rather than opening a PR here.

## Questions

Open an issue using the bug report or feature request template in `.github/ISSUE_TEMPLATE/`.
