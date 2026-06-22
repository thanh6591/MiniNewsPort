# AI Features Operations Guide

## Local Runtime Stack

- Vector DB: Qdrant
- LLM runtime: Ollama
- LLM models: `qwen2.5:7b-instruct` primary, `qwen2.5:3b-instruct` fallback
- Embeddings: `bge-m3`
- Optional reranker: `bge-reranker-v2-m3`

## Required Environment Variables

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

1. Qdrant unavailable:
- Confirm `docker compose ps` health for qdrant.
- Verify `QDRANT_URL` and collection settings.

2. Embedding/LLM unavailable:
- Verify Ollama is running at `AI_BASE_URL`.
- Pull required models before runtime.

3. High fallback rate:
- Inspect telemetry events for `fallback: true`.
- Rebuild vector index and backfill embeddings.

4. Personalization empty:
- Ensure user has reading/view history.
- Confirm feature flag and memory tiers are enabled.
