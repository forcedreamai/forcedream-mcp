import { createHash } from 'node:crypto'

// EXACT replica of the server's wfCanonical: JSON.stringify(obj, Object.keys(obj).sort())
// Replacer-ARRAY form (emits only listed keys, sorted). NOT a .reduce() lookalike.
// Proven against production proof wtask_a3ff3b4f3a1f6bf7df1f -> SIGNATURE VALID: true.
export function wfCanonical(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort())
}

export function sha256hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}
