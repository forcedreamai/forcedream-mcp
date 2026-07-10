import { createPublicKey, verify as edVerify } from 'node:crypto'
import { wfCanonical, sha256hex } from './canonical.js'

const FD_API = process.env.FD_API_BASE || 'https://api.forcedream.ai'

export interface FdProof {
  task_id: string
  agent_id: string
  input_hash: string
  output_hash: string
  cost_pence: number
  budget_pence: number
  external_cost_hash?: string
  retrieved_count?: number
  started_at: number | string
  completed_at: number | string
  algorithm?: string
  signature?: string
  key_id?: string
  worm_seal?: string
  proof_id?: string
}

export interface VerifyResult {
  verified: boolean
  task_id: string
  key_id?: string
  algorithm?: string
  fields_signed: number
  trustless: true
  message: string
  note: string
}

// Reconstruct the signable EXACTLY as wfGenerateProof did. Version-aware:
// proofs with external_cost_hash were signed over 10 fields, older ones over 8.
// Types matter (wfCanonical stringifies 5 vs "5" differently):
//   cost_pence, budget_pence, retrieved_count, started_at -> NUMBER
//   completed_at -> STRING
function buildSignable(p: FdProof): { signable: Record<string, unknown>; fields: number } {
  const hasExt = p.external_cost_hash !== undefined && p.external_cost_hash !== null
  const base: Record<string, unknown> = {
    task_id: p.task_id,
    agent_id: p.agent_id,
    input_hash: p.input_hash,
    output_hash: p.output_hash,
    cost_pence: Number(p.cost_pence),
    budget_pence: Number(p.budget_pence),
    started_at: Number(p.started_at),
    completed_at: String(p.completed_at),
  }
  if (hasExt) {
    base.external_cost_hash = String(p.external_cost_hash)
    base.retrieved_count = Number(p.retrieved_count ?? 0)
    return { signable: base, fields: 10 }
  }
  return { signable: base, fields: 8 }
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

// Trustless verification: fetch public key (+ optionally proof), reconstruct
// signable, verify Ed25519 locally. Server never asked "is this valid?".
/**
 * Trustlessly verifies a ForceDream proof's Ed25519 signature entirely client-side. Fetches the
 * public key and (if only a task_id is given) the proof itself from public, keyless endpoints,
 * then verifies locally -- ForceDream is never asked whether the proof is valid.
 * @param args.task_id - Fetches the proof from the public endpoint if proof is not given directly.
 * @param args.proof - A full proof object to verify directly, skipping the fetch.
 */
export async function verifyProof(args: { task_id?: string; proof?: FdProof }): Promise<VerifyResult> {
  let proof = args.proof
  if (!proof) {
    if (!args.task_id) throw new Error('Provide task_id or proof')
    const data = await fetchJson(`${FD_API}/v1/workforce/proof/${encodeURIComponent(args.task_id)}/public`)
    if (!data?.proof) throw new Error('proof_not_found')
    proof = data.proof as FdProof
  }

  const keyData = await fetchJson(`${FD_API}/v1/workforce/proof/public-key`)
  const pub = createPublicKey(keyData.public_key_pem)

  const { signable, fields } = buildSignable(proof)
  const digest = sha256hex(wfCanonical(signable))

  let verified = false
  if (proof.signature && (proof.algorithm === 'Ed25519' || !proof.algorithm)) {
    try {
      verified = edVerify(null, Buffer.from(digest, 'hex'), pub, Buffer.from(String(proof.signature), 'base64'))
    } catch {
      verified = false
    }
  }

  return {
    verified,
    task_id: proof.task_id,
    key_id: keyData.key_id,
    algorithm: 'Ed25519',
    fields_signed: fields,
    trustless: true,
    message: verified
      ? 'Signature mathematically verified. This proof was signed by ForceDream and has not been altered.'
      : 'Signature verification FAILED. The proof was altered or not signed by ForceDream.',
    note: 'Verified client-side via public-key cryptography. ForceDream was not asked whether the proof is valid.',
  }
}
