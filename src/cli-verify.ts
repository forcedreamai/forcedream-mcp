#!/usr/bin/env node
// Real CLI verification tool: npx @forcedream/mcp-server verify <task_id>
// Wraps the exact same verifyProof() function the MCP tool itself uses --
// no separate verification logic, no hardcoded example proof.
import { verifyProof } from './verify_proof.js'

async function main() {
  const taskId = process.argv[2]
  if (!taskId) {
    console.error('Usage: fd-verify <task_id>')
    console.error('Example: fd-verify wtask_a3ff3b4f3a1f6bf7df1f')
    process.exit(2)
  }
  try {
    const result = await verifyProof({ task_id: taskId })
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.verified ? 0 : 1)
  } catch (e: any) {
    console.error('Error:', e?.message || String(e))
    process.exit(2)
  }
}

main()
