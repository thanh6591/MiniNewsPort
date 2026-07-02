# Rollout and Rollback Runbook

## Feature Flags
Use runtime env flags to control release scope:

- `VECTOR_ENGINE` (`pgvector` | `qdrant`)
- `VECTOR_DUAL_WRITE` (`0` | `1`)
- `VECTOR_SHADOW_READ` (`0` | `1`)

- `FEATURE_SEMANTIC_SEARCH`
- `FEATURE_RECOMMENDATIONS`
- `FEATURE_PERSONALIZATION`
- `FEATURE_CHATBOT`
- `FEATURE_MEMORY_SESSION`
- `FEATURE_MEMORY_PERSISTENT`
- `FEATURE_MEMORY_AGENT`

Values: `1|true|yes` to enable, otherwise disabled.

## Rollout Sequence

1. Deploy with `VECTOR_ENGINE=pgvector`, `VECTOR_DUAL_WRITE=1`, `VECTOR_SHADOW_READ=1`.
2. Confirm `/api/health` reports `checks.pgvector.ok=true`.
3. Observe `vector_shadow_read` telemetry for overlap/latency trends.
4. Keep feature rollout sequence for semantic/recommendation/personalization/chatbot.

## Telemetry Checks

Telemetry JSONL is written to `TELEMETRY_LOG_PATH` (default `./.data/telemetry.jsonl`).

Monitor:

- `semantic_search` fallback ratio
- `article_recommendations` latency and result counts
- `personalized_recommendations` fallback ratio
- `chat_query` latency and follow-up generation counts
- `vector_shadow_read` overlapAtK, primaryLatencyMs, shadowLatencyMs, shadowError

## Rollback Procedure

1. Disable the affected capability flag.
2. Redeploy or reload runtime config.
3. Verify API returns `503 ... disabled` for disabled capability.
4. Keep the rest of the stack running if unrelated.
5. For vector incidents:
	- switch to `VECTOR_ENGINE=qdrant`
	- keep `VECTOR_DUAL_WRITE=1`
	- run `pnpm infra:up:rollback` when qdrant service is not running.
6. For severe retrieval issues, also disable chatbot and personalization.

## Data Safety

- Session memory is transient and can be reset per session.
- Persistent and agent memory can be deleted through memory endpoints.
- Telemetry should not include raw secrets or auth tokens.
