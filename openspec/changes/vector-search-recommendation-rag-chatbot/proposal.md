## Why

Users can only browse by structured fields and lack intent-based discovery, personalized surfacing, and conversational access to the article corpus. Adding vector-powered search, recommendation, and RAG chat now improves content discoverability and retention while leveraging existing article data.

## What Changes

- Add free-text semantic search that accepts natural language and retrieves similar articles using embeddings across title, summary, description, and source, with optional category narrowing.
- Add article-detail recommendations in two sections:
- Similar in-category articles with category-aware re-ranking.
- Similar cross-category articles from the broader corpus.
- Add personalized recommendations on the homepage as an "Articles you may like" section based on each signed-in user's historical views.
- Add a RAG chatbot that answers user questions from all article content and can return article cards/lists (thumbnail + title) as evidence-based recommendations.
- Add a tiered chatbot memory model covering session-only conversational memory, persistent per-user preference/history memory, and full agent memory with episodic plus semantic stores.
- Add follow-up suggestion generation for chatbot responses (always three suggestions per query).
- Add embedding/indexing and retrieval pipeline support required to keep vector search, recommendation, and chatbot knowledge synchronized with article updates.

## Capabilities

### New Capabilities
- `semantic-article-search`: Natural-language article retrieval over vector embeddings with optional category filter.
- `article-recommendations`: Similar-article retrieval with in-category re-ranking and cross-category alternatives.
- `personalized-article-feed`: User-specific recommendation feed derived from article-view history.
- `rag-article-chatbot`: Conversational QA over article knowledge with article-card grounding and follow-up prompts.
- `chatbot-memory-model`: Tiered memory architecture for session, persistent user, and agent memory behaviors.
- `article-embedding-indexing`: Embedding generation and vector index lifecycle for article ingestion, update, and retrieval.

### Modified Capabilities
- `news-api`: Add/modify API requirements for semantic search, recommendation, personalization, chat endpoints, and memory-state management.
- `public-news-site`: Add/modify UI requirements for search UX, article-detail recommendation sections, homepage personalization, and chatbot interactions with visible memory controls.
- `news-domain`: Add/modify domain requirements for tracking view-history signals, recommendation relevance behavior, and tiered memory entities/policies.

## Impact

- Affected systems: API routes, service layer, repositories, vector database integration, queue/worker indexing pipeline, memory stores/orchestrators, and Nuxt UI pages/components.
- Affected data: article embeddings, vector index metadata, user article-view events, conversational session state, persistent user memory records, episodic memory events, semantic memory summaries, and retrieval logs/telemetry.
- Dependencies: embedding model/provider, Qdrant as the local vector database baseline, prompt orchestration for RAG, memory compaction/summarization strategy, and re-ranking strategy.
- Operational impact: backfill/indexing jobs, memory retention and deletion workflows, monitoring for retrieval quality/latency, and safeguards for chatbot grounding quality.
