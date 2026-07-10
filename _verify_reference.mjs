import { createPublicKey, verify as edVerify, createHash } from 'crypto'
function wfCanonical(obj) { return JSON.stringify(obj, Object.keys(obj).sort()) }
function sha256hex(s) { return createHash('sha256').update(s).digest('hex') }
const proof = {
  task_id: "wtask_a3ff3b4f3a1f6bf7df1f",
  agent_id: "atlas-research-v1",
  input_hash: "67c25de0835136e1034351b999207b2f5dbe016b0b076464e7e4dae29f1a8d51",
  output_hash: "e601679cbd5cdcfd3e56e9f618feea64a8ebd80b5dcf50781cec095f095c1771",
  cost_pence: 25,
  budget_pence: 800,
  external_cost_hash: "823e53d3be06e23d653bb015191a0c37fedbb9c7343200e293aeefbeb5096de4",
  retrieved_count: 6,
  started_at: 1782479438487,
  completed_at: "1782479446000",
  algorithm: "Ed25519",
  signature: "mOIqV583PmDPDHK7K854O6e/Y/mOmAUc4z8DZbt55Dvcx7iFcYflBGx3BWnq3pExSvT5RgFYlByHj8mbg08MBA=="
}
const PUBKEY_PEM = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAPXuxb/0mOSujALkhidGxJsHxjuKUOUXJ/moqkGcPt3I=\n-----END PUBLIC KEY-----\n"
function buildSignable(p) {
  return {
    task_id: p.task_id, agent_id: p.agent_id, input_hash: p.input_hash, output_hash: p.output_hash,
    cost_pence: p.cost_pence, budget_pence: p.budget_pence,
    external_cost_hash: p.external_cost_hash, retrieved_count: p.retrieved_count,
    started_at: p.started_at, completed_at: p.completed_at,
  }
}
const signable = buildSignable(proof)
const canonical = wfCanonical(signable)
const digest = sha256hex(canonical)
console.log("canonical:", canonical)
console.log("digest:", digest)
const pub = createPublicKey(PUBKEY_PEM)
let ok = false
try { ok = edVerify(null, Buffer.from(digest, 'hex'), pub, Buffer.from(proof.signature, 'base64')) } catch (e) { console.log("verify error:", e.message) }
console.log("\n>>> SIGNATURE VALID:", ok)
if (!ok) {
  console.log("\n--- trying variations to find what was actually signed ---")
  for (const variant of [
    { name: "started_at as string", mut: s => ({...s, started_at: String(proof.started_at)}) },
    { name: "all nums as strings", mut: s => ({...s, cost_pence: String(s.cost_pence), budget_pence: String(s.budget_pence), retrieved_count: String(s.retrieved_count), started_at: String(s.started_at)}) },
    { name: "8-field only", mut: s => { const {external_cost_hash, retrieved_count, ...rest} = s; return rest } },
    { name: "8-field started_at str", mut: s => { const {external_cost_hash, retrieved_count, ...rest} = s; return {...rest, started_at: String(rest.started_at)} } },
  ]) {
    const sv = variant.mut(buildSignable(proof))
    const d = sha256hex(wfCanonical(sv))
    let v = false
    try { v = edVerify(null, Buffer.from(d,'hex'), pub, Buffer.from(proof.signature,'base64')) } catch {}
    console.log(`  [${variant.name}]:`, v)
  }
}
