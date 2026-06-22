# Rollout and Rollback Runbook

## Feature Flags
Use runtime env flags to control release scope:

- `FEATURE_SEMANTIC_SEARCH`
- `FEATURE_RECOMMENDATIONS`
- `FEATURE_PERSONALIZATION`
- `FEATURE_CHATBOT`
- `FEATURE_MEMORY_SESSION`
- `FEATURE_MEMORY_PERSISTENT`
- `FEATURE_MEMORY_AGENT`

Values: `1|true|yes` to enable, otherwise disabled.

## Rollout Sequence

1. Deploy with all new flags disabled in production.
2. Enable semantic search only (`FEATURE_SEMANTIC_SEARCH=1`) and observe telemetry.
3. Enable recommendations (`FEATURE_RECOMMENDATIONS=1`).
4. Enable personalization (`FEATURE_PERSONALIZATION=1`) for admin users.
5. Enable chatbot (`FEATURE_CHATBOT=1`) with session memory only.
6. Enable persistent and agent memory tiers gradually.

## Telemetry Checks

Telemetry JSONL is written to `TELEMETRY_LOG_PATH` (default `./.data/telemetry.jsonl`).

Monitor:

- `semantic_search` fallback ratio
- `article_recommendations` latency and result counts
- `personalized_recommendations` fallback ratio
- `chat_query` latency and follow-up generation counts

## Rollback Procedure

1. Disable the affected capability flag.
2. Redeploy or reload runtime config.
3. Verify API returns `503 ... disabled` for disabled capability.
4. Keep the rest of the stack running if unrelated.
5. For severe retrieval issues, also disable chatbot and personalization.

## Data Safety

- Session memory is transient and can be reset per session.
- Persistent and agent memory can be deleted through memory endpoints.
- Telemetry should not include raw secrets or auth tokens.
