## Context

The current implementation is tightly coupled to Qdrant across:
- runtime settings and health checks,
- vector collection bootstrap,
- embedding upsert/delete,
- retrieval query/filter execution.

At the same time, core entities (`news`, categories, view events) already live in Postgres. The migration goal is to keep feature contracts stable while replacing vector persistence/retrieval internals with pgvector.

## Goals / Non-Goals

**Goals**
- Keep existing API and UI contracts unchanged for semantic search, recommendations, personalization, and chatbot grounding.
- Reduce operational surface area by eliminating required Qdrant service in local/prod baseline.
- Achieve quality and latency parity (or better) before full cutover.

**Non-Goals**
- Rewriting ranking policy from scratch.
- Introducing new ML models/providers.
- Implementing hybrid keyword+vector retrieval changes unrelated to migration parity.

## Decisions

1. Vector engine abstraction remains stable
- Keep retrieval service contract unchanged and swap engine implementation behind it.
- Rationale: minimizes blast radius in feature services and endpoints.

2. Storage model in Postgres
- Add `article_embeddings` table in Postgres with:
  - `article_id` (FK-like relation to `news.id` semantics),
  - `index_version`, `category_slug`, `published_at`, `source`, `language`,
  - `embedding vector(<dimension>)`.
- Use pgvector index strategy based on benchmark:
  - start with IVFFlat for predictable baseline,
  - evaluate HNSW for latency/recall improvements.

3. Query semantics mapping
- Map current Qdrant use cases to SQL:
  - semantic search with optional category filter,
  - similar articles with exclude IDs,
  - personalized retrieval with category allow-list and excludes,
  - top-k retrieval with deterministic fallback ordering.
- Preserve reranker stage and fallback behavior.

4. Indexing lifecycle
- Replace Qdrant collection ensure/upsert/delete with SQL migration/bootstrap and upsert/delete statements.
- Keep async indexing/backfill workers and retry/DLQ behavior.

5. Migration strategy
- Phase A: dual-write (Qdrant + pgvector) for new/updated embeddings.
- Phase B: shadow-read comparisons (quality and latency telemetry only).
- Phase C: switch read path to pgvector under feature flag.
- Phase D: disable Qdrant write path.
- Phase E: remove Qdrant infra/config/docs after stability window.

## Architecture Sketch

```text
Before:

Embedding Provider -> Qdrant Indexer (HTTP) -> Qdrant
                                    |
                                    v
                            Qdrant Retrieval Service

After:

Embedding Provider -> PGVector Indexer (SQL) -> Postgres (article_embeddings)
                                    |
                                    v
                            PGVector Retrieval Service
```

## Risks / Trade-offs

- Recall or ranking parity may drift due to operator/index differences.
  - Mitigation: shadow-read A/B telemetry with acceptance thresholds.
- Latency may regress under mixed OLTP + vector workload.
  - Mitigation: index tuning, query limits, connection pool sizing, and possible read-replica strategy.
- Migration inconsistency during cutover windows.
  - Mitigation: dual-write validation checks and periodic parity audits by article ID.

## Validation Plan

- Functional parity tests for all retrieval entry points.
- Relevance sanity checks over representative query set.
- Performance checks (p50/p95 latency) under expected local/prod-like load.
- Rollback drill: switch read engine flag back to Qdrant without data loss.

## Open Questions

- Final vector index strategy in Postgres (IVFFlat vs HNSW) for current dataset scale?
- Do we keep a short-term Qdrant fallback in production after cutover or remove entirely?
- What parity threshold is acceptable for recommendation quality before full cutover?
