## Context

MiniNewsPort currently supports keyword/category browsing and article detail pages but does not support semantic retrieval, recommendation ranking, or conversational access to article knowledge. The requested features span API, data processing, storage, ranking, and frontend UX, and require introducing vector retrieval and RAG orchestration while preserving existing article workflows.

Constraints:
- Reuse the existing Nuxt + server architecture and existing repositories/services layout.
- Keep category filtering and relevance ranking deterministic enough for testability.
- Ensure recommendation and chatbot outputs can reference concrete article entities (thumbnail/title/link) instead of free-form text only.
- Index freshness must handle article create/update/delete flows.
- Memory behavior must be explicit per tier so retention, deletion, and prompt assembly are testable and auditable.

## Goals / Non-Goals

**Goals:**
- Provide semantic free-text search over article content with optional category filter.
- Provide two article-detail recommendation sections: category-constrained similar items and global similar items.
- Provide personalized homepage recommendations from user view-history signals.
- Provide RAG chatbot grounded in article corpus with article-card/list responses and exactly three follow-up questions per response.
- Provide a concrete tiered memory model for chatbot interactions: session memory, persistent user memory, and full agent memory with episodic plus semantic stores.
- Define robust embedding/indexing and retrieval architecture with clear fallback behavior.

**Non-Goals:**
- Real-time streaming fine-tuning of ranking model in this phase.
- Full multi-modal recommendation beyond text/article metadata.
- Replacing existing auth model; personalization uses existing user identity/session boundaries.
- Autonomous tool-using workflows outside article discovery, recommendation, and chat assistance.

## Decisions

1. Vector storage and retrieval
- Decision: Introduce a dedicated vector index for articles, keyed by article ID/version, storing embeddings from `title + summary + description + source` with metadata including category and publish timestamps.
- Decision: Use `Qdrant` as the default local vector database for development and test, with one collection for article embeddings and additional collections or payload partitions for semantic memory as needed.
- Rationale: Enables unified retrieval for search, recommendation, and chatbot grounding while preserving metadata filters and recency-aware ranking.
- Alternative considered: `pgvector` inside the primary relational database. Rejected for the local-first baseline because Qdrant gives simpler vector-native operations, stronger filtering/search ergonomics, and a cleaner path for hybrid retrieval experiments.
- Alternative considered: On-the-fly embedding + brute-force similarity in relational DB. Rejected due to latency and cost.

1a. Free local model baseline for development and test
- Decision: Use a free local-first stack for implementation and testing:
- Local vector database: `Qdrant`.
- Chat generation and memory summarization: `qwen2.5:7b-instruct` served via Ollama.
- Lower-resource fallback for CPU-only development: `qwen2.5:3b-instruct` via Ollama.
- Embeddings for semantic search, recommendations, and semantic memory retrieval: `bge-m3`.
- Optional reranker for higher-quality search/recommendation evaluation: `bge-reranker-v2-m3` when local resources allow.
- Rationale: This stack is free to run locally, multilingual enough for Vietnamese and English content, and strong enough for RAG-style evaluation before introducing paid providers.
- Alternative considered: hosted proprietary APIs first. Rejected because the immediate goal is low-cost testing with acceptable retrieval and chat quality.

2. Retrieval abstraction layer
- Decision: Add a retrieval service interface (`search`, `similar`, `recommendForUser`, `retrieveContext`) consumed by API endpoints and chatbot service.
- Rationale: Prevents feature-specific duplicate logic and makes vector engine/provider swappable.
- Alternative considered: Feature-local retrieval logic. Rejected due to coupling and drift in ranking behavior.

3. Re-ranking strategy for similar articles
- Decision: Use two-stage retrieval:
- Stage 1: vector candidate retrieval.
- Stage 2: deterministic re-ranking with weighted factors: category match, similarity score, recency decay, and article quality signals.
- Rationale: Guarantees the in-category section prioritizes same-category content while preserving semantic relevance.
- Alternative considered: hard category filter only. Rejected because it reduces relevance when category signal is noisy.

4. Personalization model
- Decision: Build user profile embeddings from recent weighted view events (view duration/recency), then retrieve candidates from vector index and re-rank with diversity constraints.
- Rationale: Supports "articles you may like" without requiring explicit preference collection.
- Alternative considered: collaborative filtering only. Rejected for cold-start and complexity at current scale.

5. RAG chatbot response contract
- Decision: Chat endpoint returns structured payload: `answer`, `supportingArticles[]`, `recommendedArticles[]`, and `followUpQuestions[3]`.
- Rationale: UI can reliably render article cards and ensure exactly three follow-ups each turn.
- Alternative considered: text-only answer. Rejected because requirement needs article display/list recommendations.

6. Tiered memory model
- Decision: Implement three explicit memory tiers:
- Session memory: rolling conversation state for the active chat session only, scoped to session ID and deleted on expiry/reset.
- Persistent per-user memory: durable preference/history profile derived from user-approved signals such as article views, explicit likes/saves, and durable chat preferences.
- Agent memory: split into episodic memory (time-ordered interaction/event records) and semantic memory (summaries/facts distilled from episodic/user data), both scoped per user and queryable during chat orchestration.
- Rationale: Separates short-lived context from durable preference data and higher-order distilled knowledge, which keeps retention and prompt assembly understandable.
- Alternative considered: single monolithic memory store. Rejected because it mixes retention policies, increases prompt noise, and makes deletion/privacy handling harder.

7. Memory retrieval and write policy
- Decision: Build a memory orchestrator that decides which memory tiers participate per request:
- Session tier always eligible for the active chat.
- Persistent user tier eligible only for authenticated users and memory-enabled requests.
- Agent episodic/semantic tiers eligible for advanced assistant flows and can be toggled independently.
- Writes use explicit policy gates: session writes on every turn, persistent writes on approved user-signal events, episodic writes on selected chat/recommendation events, semantic writes via async summarization/compaction jobs.
- Rationale: Prevents over-collection and keeps behavior deterministic enough for testing and privacy review.
- Alternative considered: write everything synchronously on every query. Rejected due to latency, noise, and compliance risk.

8. Memory storage model
- Decision: Store session memory in a short-TTL operational store, persistent user memory in application-owned relational tables/documents, episodic memory in append-only event records, and semantic memory as summarized embedding-backed records with provenance links.
- Rationale: Each tier has different access patterns and retention needs.
- Alternative considered: storing all memory as vectors only. Rejected because exact event auditability and preference updates need structured records.

9. Index lifecycle and consistency
- Decision: Add async indexing queue jobs for article upsert/delete and background backfill command; include index-version marker in metadata.
- Rationale: Keeps retrieval fresh with controlled throughput and rollback path.
- Alternative considered: synchronous indexing during write requests. Rejected due to write latency and external dependency risk.

9a. Qdrant collection design
- Decision: Model article vectors in Qdrant with payload fields for article ID, category, publish timestamp, source, language, and index version; use payload filtering for category narrowing and recommendation constraints.
- Rationale: Keeps semantic search and recommendation filtering fast without duplicating vector data into separate stores.
- Alternative considered: separate collection per category. Rejected because it complicates backfill, increases operational overhead, and weakens cross-category retrieval.

10. Observability and safeguards
- Decision: Add telemetry for retrieval latency, hit counts, grounded-response ratio, follow-up generation success, memory-tier usage, memory write/drop rates, summarization success, and fallback activation.
- Rationale: Needed to monitor quality and detect drift/regressions in recommendation and chat behaviors.

## Risks / Trade-offs

- [Embedding provider latency/cost spikes] -> Mitigation: batching, caching, queue-based retries, and fallback keyword retrieval.
- [Low-quality or hallucinated chat responses] -> Mitigation: strict retrieval grounding, citation/article-card requirement, and refusal fallback when confidence is low.
- [Cold-start users for personalization] -> Mitigation: backfill with category/popularity blend until sufficient view history exists.
- [Category imbalance causing repetitive recommendations] -> Mitigation: diversity penalties and cap per-category in personalized list.
- [Index staleness after article updates] -> Mitigation: versioned index metadata, dead-letter queue for failed jobs, and periodic consistency checks.
- [Memory over-retention or privacy leakage] -> Mitigation: per-tier TTL/retention rules, user-visible memory controls, and deletion workflows by user ID/session ID.
- [Semantic memory drift from poor summaries] -> Mitigation: provenance links to source events, asynchronous reviewable compaction jobs, and fallback to episodic/session-only context on low confidence.

## Migration Plan

1. Introduce vector infrastructure and retrieval service behind feature flags.
2. Provision local Qdrant collection schema and validate category/payload filtering behavior.
3. Backfill embeddings for existing articles and validate index coverage.
4. Ship semantic search endpoint and UI integration with dual-run evaluation against keyword search.
5. Ship article-detail recommendation endpoints and UI sections.
6. Enable user event capture and personalized homepage recommendations.
7. Enable session-only memory for chatbot flows and validate reset/expiry behaviors.
8. Enable persistent per-user memory and preference/history writes behind explicit feature gating.
9. Enable agent episodic plus semantic memory flows with summarization jobs and guarded rollout.
10. Enable RAG chatbot endpoint/UI with tiered-memory controls.
11. Monitor telemetry and progressively increase traffic; keep rollback switches per feature and per memory tier.

Rollback strategy:
- Disable feature flags independently for search/recommendations/chatbot and each memory tier.
- Fallback to keyword search, popularity-based recommendations, and stateless chatbot mode if vector/RAG or memory orchestration fails.

## Open Questions

- Which embedding model/provider is preferred for production cost/quality targets?
- The development baseline is fixed to Qdrant plus Ollama with `qwen2.5:7b-instruct` and `bge-m3`; the remaining question is whether production stays on this stack or swaps to a hosted provider.
- Should anonymous users receive session-scoped personalization, or only signed-in users?
- What is the retention window and privacy policy for user view-history signals?
- What confidence threshold should trigger chatbot "insufficient context" fallback?
- Which user actions besides article views are approved inputs for persistent and semantic memory formation?
- Does product want end-user controls to inspect, clear, or opt out of persistent and semantic memory separately?
