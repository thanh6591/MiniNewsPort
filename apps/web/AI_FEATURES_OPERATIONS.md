# AI Features Operations Guide

## Local Runtime Stack

- Vector DB: pgvector (Postgres extension)
- LLM runtime: Ollama
- LLM models: `qwen2.5:7b-instruct` primary, `qwen2.5:3b-instruct` fallback
- Embeddings: `bge-m3`
- Optional reranker: `bge-reranker-v2-m3`

## Required Environment Variables

### Vector migration controls

- `VECTOR_ENGINE` (`qdrant` | `pgvector`)
- `VECTOR_DUAL_WRITE` (`0` | `1`)
- `VECTOR_SHADOW_READ` (`0` | `1`)

### Read-cutover thresholds (three required cutover metrics)

- `VECTOR_CUTOVER_MIN_OVERLAP`
- `VECTOR_CUTOVER_MAX_P95_MS`
- `VECTOR_CUTOVER_MAX_ERROR_RATE`

These thresholds map to:
- top-k overlap proxy,
- p95 latency,
- error rate.

- `QDRANT_ENABLED`
- `QDRANT_URL`
- `QDRANT_API_KEY` (optional)
- `QDRANT_COLLECTION`
- `QDRANT_VECTOR_SIZE`
- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_EMBEDDING_MODEL`
- `AI_LLM_PRIMARY_MODEL`
- `AI_LLM_FALLBACK_MODEL`

## Feature Flags

- `FEATURE_SEMANTIC_SEARCH`
- `FEATURE_RECOMMENDATIONS`
- `FEATURE_PERSONALIZATION`
- `FEATURE_CHATBOT`
- `FEATURE_MEMORY_SESSION`
- `FEATURE_MEMORY_PERSISTENT`
- `FEATURE_MEMORY_AGENT`

## Privacy Controls

- Session memory: per-session transient chat context.
- Persistent memory: per-user preference/history store.
- Agent memory: episodic + semantic stores for richer context.
- Deletion endpoints are available for memory reset and user-level deletion.

## Troubleshooting

1. Pgvector unavailable:
- Confirm Postgres is healthy and `vector` extension exists.
- Check `/api/health` -> `checks.pgvector` for extension/table readiness.

2. Rollback to Qdrant (temporary guardrail):
- Start rollback profile infra: `pnpm infra:up:rollback`.
- Set `VECTOR_ENGINE=qdrant` and keep `VECTOR_DUAL_WRITE=1` until recovery completes.
- Verify `/api/health` -> `checks.qdrant.ok=true`.

3. Embedding/LLM unavailable:
- Verify Ollama is running at `AI_BASE_URL`.
- Pull required models before runtime.

4. High fallback rate:
- Inspect telemetry events for `fallback: true`.
- Rebuild vector index and backfill embeddings.

5. Personalization empty:
- Ensure user has reading/view history.
- Confirm feature flag and memory tiers are enabled.

## Migration Baseline Snapshot

For pgvector cutover, capture and store a baseline snapshot before shadow-read:
- endpoint p95 latency,
- endpoint error rate,
- top-k reference outputs for fixed probe queries/slugs.

Store snapshot artifact in the active OpenSpec change directory and compare shadow-read reports against `VECTOR_CUTOVER_*` thresholds.

## 7.x Tuning and Audit Workflow

1. Run retrieval benchmark probe:
- `pnpm vector:bench`

2. Build shadow-read summary from telemetry:
- `pnpm vector:shadow-report`
- Requires telemetry file at `TELEMETRY_LOG_PATH` (default `.data/telemetry.jsonl`).

3. Compare index strategy candidates in staging:
- Keep IVFFlat as baseline.
- Trial HNSW only when p95 or recall proxy regresses.

4. Produce go/no-go audit decision:
- `pnpm vector:audit-close`
- Reads benchmark + shadow summary and checks against `VECTOR_CUTOVER_*` thresholds.

5. Final audit log requirements:
- benchmark outputs (p50/p95/error)
- shadow-read overlap trend by operation
- chosen index strategy and rationale
