# Post-Cutover Audit Template

## Scope

- Change: migrate-vector-store-to-pgvector
- Window start:
- Window end:
- Environment: staging | production

## Required Inputs

- Latest benchmark snapshot: openspec/changes/migrate-vector-store-to-pgvector/benchmark-latest.json
- Shadow-read telemetry summary (vector_shadow_read)
- Health snapshots showing pgvector readiness

## 7.1 Index Strategy Evaluation

- Baseline strategy: IVFFlat
- Candidate strategy: HNSW
- Dataset profile (row count, category spread):
- Observed p95 delta:
- Observed error-rate delta:
- Recall/overlap proxy delta:
- Decision:

## 7.2 Tuning Decisions

- Query-level tuning applied:
- Index-level tuning applied:
- Why tuning was needed (bottleneck evidence):
- Verification results:

## 7.3 Final Audit and Closure

- Cutover guardrail status:
- Rollback drill result:
- Outstanding risks:
- Follow-up tickets:
- Final approval:
