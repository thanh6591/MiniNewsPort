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
- Execute a safe cutover with constrained scope first, then defer non-critical optimization/cleanup.

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
- Phase 1 - Must-Have Safe Cutover: dual-write + shadow-read window (3-5 days) + read cutover with rollback guardrail.
- Phase 2 - Post-Stability Cleanup and Hardening: remove Qdrant dependency and run optional index/performance tuning.

6. Go/No-Go criteria and telemetry scope
- Use only the three required cutover metrics for read-cutover decisions:
  - top-k overlap proxy between Qdrant and pgvector,
  - p95 latency,
  - error rate.
- Timebox the shadow-read window to 3-5 days to avoid indefinite migration drag.
- Rationale: keeps migration decision objective while constraining scope.

7. Cutover safety posture
- Keep rollback path active at read-engine switch time.
- Delay infrastructure deletion (Qdrant removal) until the stability window completes.
- Rationale: separates reversible feature cutover from irreversible cleanup.

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
- Timeboxed shadow-read report (3-5 days) using top-k overlap proxy, p95 latency, and error rate.
- Go/no-go decision log based on predeclared thresholds for the three required cutover metrics.
- Rollback drill: switch read engine flag back to Qdrant without data loss.

## Phase Breakdown

### Phase 1 - Must-Have Safe Cutover
- Enable pgvector schema/indexing path.
- Run dual-write for embedding lifecycle.
- Run shadow-read comparisons under timebox.
- Cut over read engine behind flag with rollback guardrail still active.

### Phase 2 - Post-Stability Cleanup and Hardening
- Remove Qdrant infra/config/runtime dependencies after stability window.
- Run optional index-strategy and query tuning only if metrics warrant.
- Finalize migration audit and close residual technical debt.

## Open Questions

- Final vector index strategy in Postgres (IVFFlat vs HNSW) for current dataset scale?
- Do we keep a short-term Qdrant fallback in production after cutover or remove entirely?
- What parity threshold is acceptable for recommendation quality before full cutover?
