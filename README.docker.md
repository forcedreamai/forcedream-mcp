# Running the ForceDream MCP Server via Docker

**This is a stdio-based MCP server, not an HTTP service.** Confirmed directly against the
real source (`src/index.ts` uses `StdioServerTransport`, has no `process.env` reads, and
never calls `.listen()` on any port). It communicates over the container's stdin/stdout --
the same way a locally-run `npx @forcedream/mcp-server` process would. There is nothing to
`curl` and no port to publish; running it detached (`docker run -d`) will not work, because
nothing would ever be connected to its stdin.

## Pull

```bash
docker pull forcedream/forcedream-mcp
```

## Use with Claude Desktop (or any stdio-based MCP host)

Add this to your MCP client's config (for Claude Desktop,
`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "forcedream": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "forcedream/forcedream-mcp"]
    }
  }
}
```

- `-i` keeps stdin open -- required, since that's the entire transport.
- `--rm` cleans up the container on exit, since the client spawns a fresh one each session.

## Run it directly, for manual testing

```bash
docker run -i --rm forcedream/forcedream-mcp
```

Then type a real MCP JSON-RPC request on stdin, e.g.:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"manual-test","version":"0.1"}}}
```

and press Enter -- you should get a real `initialize` response back on stdout.

## Passing environment variables (if/when needed)

The current server doesn't read any environment variables directly (confirmed against the
real source) -- individual tool calls (like `invoke_agent`) take a real API key as an MCP
tool argument, not a container-level secret. If that changes in a future version, pass
variables the standard way:

```bash
docker run -i --rm -e SOME_VAR=value forcedream/forcedream-mcp
```

## Building locally

```bash
docker build -t forcedream/forcedream-mcp .
```

Multi-stage: the build stage installs `devDependencies` (needed for `tsc`), the runtime
stage installs only production dependencies and copies in the compiled `dist/` -- keeps the
final image smaller and free of build-only tooling.
