#!/usr/bin/env node
// Real CLI verification tool: npx @forcedream/mcp-server verify <task_id> [--json] [--quiet]
// Wraps the exact same verifyProof() function the MCP tool itself uses --
// no separate verification logic, no hardcoded example proof.
import { verifyProof } from './verify_proof.js'

function printUsage() {
  console.error('Usage: fd-verify <task_id> [options]')
  console.error('')
  console.error('Options:')
  console.error('  --json, -j    Compact, single-line JSON output (for piping into jq, grep, etc.)')
  console.error('  --quiet, -q   No output at all; rely on the exit code only')
  console.error('')
  console.error('Exit codes: 0 = verified, 1 = verification failed, 2 = usage or fetch error')
  console.error('')
  console.error('Example: fd-verify wtask_a3ff3b4f3a1f6bf7df1f')
  console.error('Example: fd-verify wtask_a3ff3b4f3a1f6bf7df1f --json | jq .verified')
  console.error('Example: fd-verify wtask_a3ff3b4f3a1f6bf7df1f --quiet && echo "genuine"')
}

async function main() {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter((a) => a.startsWith('-')))
  const taskId = args.find((a) => !a.startsWith('-'))

  const compact = flags.has('--json') || flags.has('-j')
  const quiet = flags.has('--quiet') || flags.has('-q')

  if (!taskId) {
    printUsage()
    process.exit(2)
  }

  try {
    const result = await verifyProof({ task_id: taskId })
    if (!quiet) {
      console.log(compact ? JSON.stringify(result) : JSON.stringify(result, null, 2))
    }
    process.exit(result.verified ? 0 : 1)
  } catch (e: any) {
    if (!quiet) console.error('Error:', e?.message || String(e))
    process.exit(2)
  }
}

main()
