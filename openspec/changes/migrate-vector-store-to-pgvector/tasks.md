## Phase 1 - Must-Have Safe Cutover

### 1. Guardrails and Success Criteria

- [x] 1.1 Define minimum flags: `VECTOR_ENGINE`, `VECTOR_DUAL_WRITE`, `VECTOR_SHADOW_READ`.
- [x] 1.2 Capture Qdrant baseline for the three required cutover metrics only: top-k overlap proxy, p95 latency, error rate.
- [x] 1.3 Set explicit go/no-go thresholds for the three required cutover metrics before read cutover.

### 2. Pgvector Data Plane

- [x] 2.1 Add migration enabling `pgvector` extension.
- [x] 2.2 Add `article_embeddings` table with metadata needed by current filters/exclusions.
- [x] 2.3 Add initial vector + metadata indexes (baseline strategy only; no premature tuning matrix).
- [x] 2.4 Add repository helpers for upsert, delete, and top-k similarity query.

### 3. Indexing Migration (Dual-Write First)

- [x] 3.1 Implement pgvector upsert/delete in indexer preserving current payload semantics.
- [x] 3.2 Enable dual-write (Qdrant + pgvector) for new/updated/deleted embeddings.
- [x] 3.3 Update backfill to fill pgvector and report coverage/parity counts.

### 4. Retrieval Migration (Shadow-Read Timeboxed)

- [x] 4.1 Add PGVector retrieval engine implementing current retrieval interface.
- [x] 4.2 Map existing filter semantics (category, excludes, limits) to SQL queries.
- [x] 4.3 Wire shadow-read comparison telemetry (Qdrant vs pgvector overlap + latency).
- [ ] 4.4 Run a shadow-read window of 3-5 days, then decide cutover by predefined thresholds.

### 5. Integration and Cutover

- [x] 5.1 Wire semantic search, recommendations, personalization, and chatbot grounding to engine switch.
- [x] 5.2 Add/adjust health checks to include pgvector readiness and keep rollback path to Qdrant.
- [x] 5.3 Add focused tests for retrieval parity + deterministic fallback in critical flows.
- [x] 5.4 Cut over read path to pgvector with rollback guardrail still enabled.

## Phase 2 - Post-Stability Cleanup and Hardening

### 6. Infra and Config Cleanup

- [x] 6.1 Remove Qdrant dependency from local scripts/compose after stability window.
- [ ] 6.2 Remove Qdrant runtime settings and dead code paths.
- [x] 6.3 Update operational docs/runbooks for pgvector-only operations.

### 7. Performance and Quality Tuning (Optional)

- [ ] 7.1 Evaluate index strategy upgrades (e.g., IVFFlat vs HNSW) using production-like workload.
- [ ] 7.2 Tune query/index settings only when metrics show clear bottlenecks.
- [ ] 7.3 Finalize post-cutover audit and close migration tasks.
