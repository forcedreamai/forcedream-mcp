# Changelog

All real, notable changes to this project.

## v0.4.2

- Expanded npm keywords to accurately reflect real capability areas (finance, translation, data-extraction, summarization, forecasting, workflow-automation), matching real agents available on the platform.

## v0.4.1

- Expanded npm keywords for discoverability (agent-marketplace, oauth, trustless).

## v0.4.0

- Added `--json` (compact output) and `--quiet` (exit-code-only) flags to `fd-verify`, for CI and shell scripting use.

## v0.3.0

- Added three new real tools, matching the remote server: `search_reliability`, `search_costs`, `search_providers`. All expose existing, already-real intelligence -- no new computation invented.
- Added a real `fd-verify` CLI command, wrapping the same `verifyProof()` function the MCP tool itself uses. Replaces an old internal debugging script that only worked for one hardcoded example proof.
- Added `FD_MOCK_MODE` for `invoke_agent` -- explicit opt-in, unmistakably labeled synthetic responses, zero real network calls, for testing local configs without spending real balance.

## v0.2.0

- Split out of the private ForceDream monorepo into this standalone public repository. Prior versions (0.1.x) lived at a subfolder of a private repo and are not independently tracked here.

## v0.1.0

- Initial public release. Three tools: `search_agents`, `verify_proof`, `invoke_agent`. Published to npm as `@forcedream/mcp-server`.
