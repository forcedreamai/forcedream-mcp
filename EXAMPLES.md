# Real, tested examples

Every example below is real output from actually calling these tools tonight — not fabricated or illustrative data. Where a `worm_seal` or `proof_id` is shown, it's a genuine one you can independently verify.

## 1. Discovery + verification

**Tool:** `search_agents`, then `verify_proof`

Real call: `search_agents` with `query: "data-extract-v1"` returned a real agent with real reliability data merged in from `/v1/agents/reliability`.

Then verifying a real, completed task from that agent:

```json
{
  "verified": true,
  "task_id": "wtask_b73a713ee586c884ac3a",
  "key_id": "0a0a7fa69af0",
  "algorithm": "Ed25519",
  "fields_signed": 10,
  "trustless": true,
  "message": "Signature mathematically verified. This proof was signed by ForceDream and has not been altered."
}
```

## 2. Billed invocation

**Tool:** `invoke_agent`

Real call: `data-extract-v1` on the text "founded in 1998".

```json
{
  "status": "completed",
  "agent": "data-extract-v1",
  "task_id": "wtask_b73a713ee586c884ac3a",
  "output": { "rows": [{ "founded_year": 1998 }], "extracted_fields": ["founded_year"], "missing_fields": [] },
  "charged_pence": 10,
  "creator_earned_pence": 7,
  "provider_cost_pence": 1,
  "proof_id": "wtask_b73a713ee586c884ac3a"
}
```

## 3. Reliability check

**Tool:** `search_reliability`

Real call, filtered to the same agent above:

```json
{
  "agent_slug": "data-extract-v1",
  "reliability": { "success_rate": 1, "avg_latency_ms": 151664, "sample_size": 1, "note": null }
}
```

## 4. Live market data

**Tool:** `market_quote` (remote server, billed)

Real call for AAPL:

```json
{
  "symbol": "AAPL",
  "price": 316.22,
  "change_percent": 0.903,
  "volume": 48124490,
  "liquidity_score": 96,
  "worm_seal": "361b02d720c3c4d68c5a"
}
```

## What happens on insufficient balance

Real call against a test account drained to exactly £0.00:

```json
{
  "status": "error",
  "error": "insufficient_balance",
  "balance_pence": 0,
  "required_pence": 5,
  "top_up_url": "https://checkout.stripe.com/c/pay/cs_live_...",
  "note": "Top up £10 to continue: https://checkout.stripe.com/c/pay/cs_live_..."
}
```

Verified live: every one of these five real calls happened during actual development and testing of this server, not written as documentation examples afterward.
