## 1. Planning and Baseline

- [ ] 1.1 Define migration feature flags (`VECTOR_ENGINE`, dual-write, shadow-read, cutover).
- [ ] 1.2 Capture baseline quality/latency metrics from current Qdrant path for comparison.
- [ ] 1.3 Define acceptance thresholds for parity (relevance, hit-rate, p95 latency).

## 2. Data and Schema Setup

- [ ] 2.1 Add Postgres migration enabling `pgvector` extension.
- [ ] 2.2 Add `article_embeddings` table schema and supporting metadata columns.
- [ ] 2.3 Add vector index(es) and metadata indexes required by retrieval filters.
- [ ] 2.4 Add repository/query helpers for upsert, delete, and similarity search.

## 3. Indexing Pipeline Migration

- [ ] 3.1 Implement pgvector-based upsert flow in indexer while preserving existing payload semantics.
- [ ] 3.2 Implement pgvector-based delete flow.
- [ ] 3.3 Implement dual-write mode (Qdrant + pgvector) for safe transition.
- [ ] 3.4 Update backfill worker to support pgvector targets and parity audit logging.

## 4. Retrieval Engine Migration

- [ ] 4.1 Add PGVector retrieval engine implementing current retrieval interface.
- [ ] 4.2 Map filters/exclusions/category constraints to SQL query forms.
- [ ] 4.3 Add shadow-read comparison instrumentation (Qdrant vs pgvector result overlap and latency).
- [ ] 4.4 Add runtime switch for read path cutover.

## 5. API and Service Integration

- [ ] 5.1 Wire semantic search service to engine abstraction with pgvector option.
- [ ] 5.2 Wire article recommendations service to pgvector engine.
- [ ] 5.3 Wire personalization retrieval to pgvector engine.
- [ ] 5.4 Wire chatbot grounding retrieval to pgvector engine.

## 6. Operational and Config Cleanup

- [ ] 6.1 Add/adjust runtime config for pgvector engine selection and tuning values.
- [ ] 6.2 Update health endpoint/plugin checks to monitor pgvector readiness instead of Qdrant.
- [ ] 6.3 Update local infra scripts and compose dependencies to make Qdrant optional/removed.
- [ ] 6.4 Update operational docs/runbooks for pgvector troubleshooting and rollback.

## 7. Validation and Rollout

- [ ] 7.1 Add tests for pgvector retrieval parity and deterministic fallback behavior.
- [ ] 7.2 Run shadow-read in dev/staging and review telemetry against acceptance thresholds.
- [ ] 7.3 Execute staged cutover to pgvector read path with rollback guardrails.
- [ ] 7.4 Remove Qdrant path after stability window and finalize cleanup.
