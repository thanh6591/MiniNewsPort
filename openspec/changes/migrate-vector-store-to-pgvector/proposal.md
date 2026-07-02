## Why

Current AI retrieval features rely on Qdrant as a separate vector service. This increases operational complexity (extra container/service health checks, extra runtime settings, extra backup/restore path) and creates consistency gaps between relational article data and vector index state. Moving vector storage to Postgres via `pgvector` can simplify deployment and data lifecycle while keeping semantic search, recommendations, personalization, and RAG chatbot behavior intact.

## What Changes

- Replace Qdrant-backed vector storage with Postgres `pgvector` for article embeddings.
- Introduce a Postgres vector repository/engine implementing current retrieval contracts (`search`, `similar`, `recommendForUser`, `retrieveContext`).
- Migrate embedding upsert/delete flows from Qdrant HTTP calls to SQL operations.
- Execute migration in two phases:
	- Phase 1 - Must-Have Safe Cutover: dual-write, shadow-read window (3-5 days), read cutover with rollback guardrail.
	- Phase 2 - Post-Stability Cleanup and Hardening: remove Qdrant dependency and complete non-critical tuning.
- Use explicit go/no-go criteria for read cutover based on the three required cutover metrics: top-k overlap proxy, p95 latency, and error rate.

## Capabilities

### Modified Capabilities
- `semantic-article-search`: Retrieval engine implementation changes from Qdrant to pgvector while preserving API behavior.
- `article-recommendations`: Similarity candidate generation changes backend store/queries, preserving two-section response contract.
- `personalized-article-feed`: User-profile candidate retrieval changes backend store/queries, preserving output behavior.
- `rag-article-chatbot`: Grounding retrieval backend changes to pgvector while preserving response contract (`answer`, article lists, follow-ups).
- `article-embedding-indexing`: Index lifecycle operations move from Qdrant collection/points operations to Postgres vector table/index operations.

### Operational Changes
- Add Postgres vector extension/table/index management and migration telemetry.
- Keep Qdrant rollback path during cutover; remove Qdrant runtime flags/health dependencies only after the stability window.

## Impact

- Affected systems: vector runtime config, indexer, retrieval service, health endpoint, server plugin bootstrap, infra scripts (`infra:up`, `infra:down`), and AI operations docs.
- Affected data: article embedding persistence location and retrieval query plans.
- Dependencies: PostgreSQL extension `vector` (`pgvector`), index strategy selection (HNSW or IVFFlat), query/operator tuning, and fallback policy.
- Risk areas: retrieval relevance parity, latency regressions under load, and migration consistency.

## Rollout Shape

- Phase 1 target: safe cutover with constrained scope and bounded shadow-read window (3-5 days).
- Phase 2 target: irreversible cleanup and optional performance tuning only after Phase 1 stability confirmation.

## Success Criteria

- Read cutover is approved only when predeclared thresholds for the three required cutover metrics are met.
- Rollback from pgvector read path to Qdrant can be executed by flag without data loss.

## Out of Scope

- Changing embedding model/provider in this change.
- Changing chatbot memory model semantics.
- Broad ranking-policy redesign beyond parity-safe adjustments needed by SQL retrieval.
