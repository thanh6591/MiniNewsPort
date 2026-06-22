## 1. Vector Infrastructure Setup

- [x] 1.1 Add `Qdrant` local service configuration, connection bootstrap, and health checks in server runtime config and local development stack.
- [x] 1.2 Define Qdrant collection schema and payload fields for article embeddings (article ID/version, category, timestamps, metadata).
- [x] 1.3 Add local model runtime configuration for Ollama with `qwen2.5:7b-instruct` as default chat model, `qwen2.5:3b-instruct` fallback, and `bge-m3` embeddings.
- [x] 1.4 Introduce embedding/provider abstraction and environment-driven model selection.
- [x] 1.5 Implement retrieval service interface (`search`, `similar`, `recommendForUser`, `retrieveContext`).

## 2. Embedding and Indexing Pipeline

- [x] 2.1 Implement article-to-embedding payload builder from title, summary, description, and source.
- [x] 2.2 Implement Qdrant upsert flow for article embeddings on create/update events.
- [x] 2.3 Add Qdrant delete flow for article removal and ensure idempotent execution.
- [x] 2.4 Create backfill command/script to index existing articles in batches with retry handling.
- [x] 2.5 Add optional local reranker integration using `bge-reranker-v2-m3` for evaluation-quality search/recommendation ranking.
- [x] 2.6 Add dead-letter/error logging for failed indexing operations.

## 3. Semantic Search API

- [x] 3.1 Add API endpoint for semantic free-text search with optional category filter parameter.
- [x] 3.2 Implement semantic ranking and deterministic fallback behavior when vector retrieval fails.
- [x] 3.3 Add response metadata contract (score/fallback flags) for client rendering.
- [x] 3.4 Add integration tests for query-only, query+category, and fallback paths.

## 4. Recommendation APIs

- [x] 4.1 Implement article-detail recommendation endpoint returning in-category similar list.
- [x] 4.2 Implement article-detail recommendation endpoint/section for global cross-category similar list.
- [x] 4.3 Implement deduplication and re-ranking policy (category affinity, similarity, recency).
- [x] 4.4 Add endpoint tests covering ranking behavior and no-duplicate guarantees.

## 5. Personalization Domain and API

- [x] 5.1 Define and persist user article-view events required for recommendation personalization.
- [x] 5.2 Implement user-profile embedding/feature builder from recent weighted view history.
- [x] 5.3 Add authenticated API endpoint for "articles you may like" with cold-start fallback.
- [x] 5.4 Add tests for authenticated personalization, insufficient-history fallback, and data isolation.

## 6. Memory Model and Governance

- [x] 6.1 Define data models and retention rules for session memory, persistent user memory, episodic memory, and semantic memory.
- [x] 6.2 Implement memory orchestrator policy for request-time tier selection and prompt assembly.
- [x] 6.3 Implement session-memory storage, expiry, and reset flows.
- [x] 6.4 Implement persistent user memory writes from approved preference/history signals with consent gating.
- [x] 6.5 Implement episodic memory event storage and semantic memory summarization/compaction jobs with provenance.
- [x] 6.6 Add deletion/opt-out workflows and tests for per-tier memory governance.

## 7. RAG Chatbot Service and API

- [x] 7.1 Implement chat retrieval pipeline to fetch top grounded article contexts from vector index.
- [x] 7.2 Integrate memory orchestrator into chat generation so enabled memory tiers contribute context safely.
- [x] 7.3 Implement chat generation service that returns answer plus structured article references.
- [x] 7.4 Implement follow-up generation that always returns exactly three follow-up questions.
- [x] 7.5 Add chatbot API endpoint contract (`answer`, article refs, follow-ups, memory mode/reset behavior) and validation.
- [x] 7.6 Add tests for grounded responses, article-card payload integrity, follow-up count enforcement, and memory-tier isolation.

## 8. Public Site UI Integration

- [x] 8.1 Update search UI to support natural-language semantic queries and category narrowing.
- [x] 8.2 Add dual recommendation sections to article detail page (in-category and global similar).
- [x] 8.3 Add homepage "Articles you may like" section for authenticated users with fallback states.
- [x] 8.4 Add chatbot UI module rendering answer text, article cards/lists, three follow-up actions, and memory controls.
- [x] 8.5 Add/extend e2e tests for semantic search, recommendation sections, personalization feed, chat reset flow, and chatbot memory behavior.

## 9. Rollout, Observability, and Safety

- [x] 9.1 Add feature flags for semantic search, recommendations, personalization, chatbot, and each memory tier.
- [x] 9.2 Add telemetry for latency, retrieval hit rate, fallback usage, chatbot grounding quality, memory-tier usage, and summarization success.
- [x] 9.3 Define rollout and rollback runbook with staged enablement and operational thresholds per feature and memory tier.
- [x] 9.4 Document configuration, privacy considerations for view history and memory retention, plus operational troubleshooting.