import { createPublicKey, generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto'
import { verifyProof, type FdProof } from './verify_proof.js'
import { wfCanonical, sha256hex } from './canonical.js'

// New 10-field proof (Atlas) — proven genuine.
const newProof: FdProof = {
  proof_id: 'wfproof_519150efb3b4d99c88dc',
  task_id: 'wtask_a3ff3b4f3a1f6bf7df1f',
  agent_id: 'atlas-research-v1',
  input_hash: '67c25de0835136e1034351b999207b2f5dbe016b0b076464e7e4dae29f1a8d51',
  output_hash: 'e601679cbd5cdcfd3e56e9f618feea64a8ebd80b5dcf50781cec095f095c1771',
  cost_pence: 25,
  budget_pence: 800,
  external_cost_hash: '823e53d3be06e23d653bb015191a0c37fedbb9c7343200e293aeefbeb5096de4',
  retrieved_count: 6,
  started_at: 1782479438487,
  completed_at: '1782479446000',
  algorithm: 'Ed25519',
  signature: 'mOIqV583PmDPDHK7K854O6e/Y/mOmAUc4z8DZbt55Dvcx7iFcYflBGx3BWnq3pExSvT5RgFYlByHj8mbg08MBA==',
}

// Old 8-field proof (compliance, pre-external-cost) — proven genuine.
const oldProof: FdProof = {
  proof_id: 'wfproof_ee150e758c537ffa5ce6',
  task_id: 'wtask_f698bc60ebe2a58c5f7c',
  agent_id: 'dispatcher',
  input_hash: 'f104d3d92ef7f469be33aef5b0eb843b7fe22f8e84071f236e6dfbef6d46fcc7',
  output_hash: '8ef1e01c13b5e611da11efca28af6a6d77db3f1ea7a9792dc4a21a15b0e11b96',
  cost_pence: 27,
  budget_pence: 1500,
  started_at: 1782421109155,
  completed_at: '1782421120600',
  algorithm: 'Ed25519',
  signature: '4VTrOX/3+1hdXhSKCZiUNxILJUT03VQ238505qIvszlOhbmpKTiqW7h1fsvwBOiO4gZ4q8ycJgeljmN6F/5zBg==',
}

function row(n: string, got: boolean, want: boolean) {
  const ok = got === want
  console.log(`[${n}] -> verified=${got}  ${ok ? 'PASS' : 'FAIL'}`)
  return ok
}

async function main() {
  let pass = true

  pass = row('1 genuine NEW (10-field)', (await verifyProof({ proof: newProof })).verified, true) && pass
  pass = row('2 tampered cost        ', (await verifyProof({ proof: { ...newProof, cost_pence: 9999 } })).verified, false) && pass
  pass = row('3 tampered output      ', (await verifyProof({ proof: { ...newProof, output_hash: '0'.repeat(64) } })).verified, false) && pass
  pass = row('4 tampered extcost     ', (await verifyProof({ proof: { ...newProof, external_cost_hash: '0'.repeat(64) } })).verified, false) && pass

  // 6: genuine OLD 8-field proof MUST verify (regression for historical proofs)
  const old = await verifyProof({ proof: oldProof })
  pass = row(`6 genuine OLD (${old.fields_signed}-field) `, old.verified, true) && pass

  // 7: missing signature -> false, no throw
  const { signature, ...noSig } = newProof
  pass = row('7 missing signature    ', (await verifyProof({ proof: noSig as FdProof })).verified, false) && pass

  // 8: wrong algorithm -> false
  pass = row('8 wrong algorithm      ', (await verifyProof({ proof: { ...newProof, algorithm: 'RS256' } })).verified, false) && pass

  // 9: garbage proof -> graceful false
  try {
    const g = await verifyProof({ proof: { task_id: 'x', agent_id: 'y' } as FdProof })
    pass = row('9 garbage proof        ', g.verified, false) && pass
  } catch (e) {
    console.log('[9] garbage proof       -> THREW (should be graceful false):', (e as Error).message, 'FAIL')
    pass = false
  }

  // 10: proof signed by a DIFFERENT key must be rejected (we verify the REAL key, not any key)
  const { privateKey } = generateKeyPairSync('ed25519')
  const forged = { ...newProof }
  const signable = {
    task_id: forged.task_id, agent_id: forged.agent_id, input_hash: forged.input_hash, output_hash: forged.output_hash,
    cost_pence: Number(forged.cost_pence), budget_pence: Number(forged.budget_pence),
    external_cost_hash: String(forged.external_cost_hash), retrieved_count: Number(forged.retrieved_count),
    started_at: Number(forged.started_at), completed_at: String(forged.completed_at),
  }
  const digest = sha256hex(wfCanonical(signable))
  forged.signature = edSign(null, Buffer.from(digest, 'hex'), privateKey).toString('base64')
  pass = row('10 wrong-key forgery   ', (await verifyProof({ proof: forged })).verified, false) && pass

  console.log('\n=== SELF-TEST:', pass ? 'ALL PASS' : 'FAILURES', '===')
  process.exit(pass ? 0 : 1)
}
main()
