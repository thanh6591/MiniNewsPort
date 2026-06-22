## ADDED Requirements

### Requirement: Session-only conversational memory
The system SHALL maintain session-scoped conversational memory for each active chat session and exclude that memory from other sessions.

#### Scenario: Reuse prior turns within one session
- **WHEN** a user sends a follow-up question in the same chat session
- **THEN** the system uses prior turns from that session to resolve context for the response

### Requirement: Session memory reset and expiry
The system MUST allow session memory to be cleared on user reset and removed automatically after session expiry.

#### Scenario: Clear session memory
- **WHEN** a user resets the chat session or the session expires
- **THEN** the system removes the session conversational memory and subsequent queries start without prior session context

### Requirement: Persistent per-user preference and history memory
The system SHALL maintain durable per-user memory derived from approved preference and history signals for authenticated users.

#### Scenario: Reuse durable user memory
- **WHEN** an authenticated user starts a new chat session after prior eligible interactions
- **THEN** the system can personalize the response using that user's persisted preference and history memory

### Requirement: Episodic agent memory
The system SHALL record episodic memory as ordered user-specific interaction events with provenance.

#### Scenario: Store episodic interaction record
- **WHEN** a memory-eligible chat or recommendation interaction completes
- **THEN** the system stores an episodic record linked to the user, timestamp, and source interaction

### Requirement: Semantic agent memory
The system SHALL maintain semantic memory as summarized facts or preferences distilled from episodic and persistent user memory with traceable provenance.

#### Scenario: Use semantic memory in advanced chat
- **WHEN** the chatbot processes a request that enables advanced agent memory
- **THEN** the system may retrieve semantic memory summaries linked to the current user and include them in prompt assembly

### Requirement: Memory-tier governance
The system MUST enforce per-tier retention, deletion, and opt-out policies.

#### Scenario: Apply per-tier deletion request
- **WHEN** a user or operator requests deletion of a user's persistent or agent memory
- **THEN** the system deletes the requested tier data without deleting unrelated article knowledge or other users' memory