import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type Role = "user" | "assistant";

type SessionTurn = {
  role: Role;
  content: string;
  timestamp: string;
};

type PersistentSignal = {
  type: "article_view" | "explicit_preference";
  articleId?: number;
  value?: string;
  timestamp: string;
};

type EpisodicEvent = {
  id: string;
  kind: "chat" | "recommendation";
  content: string;
  timestamp: string;
  source: string;
};

type SemanticMemory = {
  summary: string;
  updatedAt: string;
  provenanceEventIds: string[];
};

type UserMemory = {
  preferences: {
    persistentEnabled: boolean;
    agentEnabled: boolean;
  };
  persistentSignals: PersistentSignal[];
  episodicEvents: EpisodicEvent[];
  semanticMemory: SemanticMemory;
};

type MemoryDb = {
  users: Record<string, UserMemory>;
};

const SESSION_STORE = new Map<string, SessionTurn[]>();

function memoryPath() {
  return process.env.MEMORY_STORE_PATH || "./.data/chat-memory.json";
}

function maxSessionTurns() {
  const value = Number(process.env.MEMORY_SESSION_MAX_TURNS || "20");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 20;
}

function maxPersistentSignals() {
  const value = Number(process.env.MEMORY_PERSISTENT_MAX_SIGNALS || "200");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 200;
}

function maxEpisodicEvents() {
  const value = Number(process.env.MEMORY_EPISODIC_MAX_EVENTS || "400");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 400;
}

function retentionDays() {
  const value = Number(process.env.MEMORY_RETENTION_DAYS || "90");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 90;
}

async function loadDb(): Promise<MemoryDb> {
  try {
    const content = await readFile(memoryPath(), "utf8");
    const parsed = JSON.parse(content) as MemoryDb;
    if (!parsed || typeof parsed !== "object" || !parsed.users) {
      return { users: {} };
    }
    return parsed;
  } catch {
    return { users: {} };
  }
}

async function saveDb(db: MemoryDb) {
  const file = memoryPath();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2), "utf8");
}

function defaultUserMemory(): UserMemory {
  return {
    preferences: {
      persistentEnabled: true,
      agentEnabled: true
    },
    persistentSignals: [],
    episodicEvents: [],
    semanticMemory: {
      summary: "",
      updatedAt: new Date(0).toISOString(),
      provenanceEventIds: []
    }
  };
}

function pruneByRetention<T extends { timestamp: string }>(items: T[]) {
  const cutoff = Date.now() - retentionDays() * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const ts = Date.parse(item.timestamp);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function ensureUser(db: MemoryDb, userId: string) {
  if (!db.users[userId]) {
    db.users[userId] = defaultUserMemory();
  }
  return db.users[userId];
}

function compactSemantic(events: EpisodicEvent[]) {
  const recent = events.slice(-20);
  const bullets = recent.map((event) => `- ${event.content.slice(0, 140)}`);
  return {
    summary: bullets.join("\n"),
    provenanceEventIds: recent.map((event) => event.id),
    updatedAt: new Date().toISOString()
  };
}

export function appendSessionTurn(sessionId: string, role: Role, content: string) {
  const turns = SESSION_STORE.get(sessionId) || [];
  turns.push({ role, content, timestamp: new Date().toISOString() });
  SESSION_STORE.set(sessionId, turns.slice(-maxSessionTurns()));
}

export function getSessionContext(sessionId: string) {
  return SESSION_STORE.get(sessionId) || [];
}

export function resetSessionMemory(sessionId: string) {
  SESSION_STORE.delete(sessionId);
}

export async function getMemoryPreferences(userId: string) {
  const db = await loadDb();
  const user = ensureUser(db, userId);
  return user.preferences;
}

export async function updateMemoryPreferences(
  userId: string,
  updates: Partial<{ persistentEnabled: boolean; agentEnabled: boolean }>
) {
  const db = await loadDb();
  const user = ensureUser(db, userId);
  user.preferences = {
    persistentEnabled: updates.persistentEnabled ?? user.preferences.persistentEnabled,
    agentEnabled: updates.agentEnabled ?? user.preferences.agentEnabled
  };
  await saveDb(db);
  return user.preferences;
}

export async function addPersistentSignal(userId: string, signal: Omit<PersistentSignal, "timestamp">) {
  const db = await loadDb();
  const user = ensureUser(db, userId);

  if (!user.preferences.persistentEnabled) {
    return { accepted: false as const, reason: "persistent_disabled" };
  }

  user.persistentSignals = pruneByRetention(user.persistentSignals);
  user.persistentSignals.push({ ...signal, timestamp: new Date().toISOString() });
  user.persistentSignals = user.persistentSignals.slice(-maxPersistentSignals());
  await saveDb(db);

  return { accepted: true as const };
}

export async function addEpisodicEvent(userId: string, event: Omit<EpisodicEvent, "id" | "timestamp">) {
  const db = await loadDb();
  const user = ensureUser(db, userId);

  if (!user.preferences.agentEnabled) {
    return { accepted: false as const, reason: "agent_disabled" };
  }

  user.episodicEvents = pruneByRetention(user.episodicEvents);
  user.episodicEvents.push({
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString()
  });
  user.episodicEvents = user.episodicEvents.slice(-maxEpisodicEvents());
  user.semanticMemory = compactSemantic(user.episodicEvents);

  await saveDb(db);
  return { accepted: true as const };
}

export async function rebuildSemanticMemory(userId: string) {
  const db = await loadDb();
  const user = ensureUser(db, userId);
  user.semanticMemory = compactSemantic(user.episodicEvents);
  await saveDb(db);
  return user.semanticMemory;
}

export async function getAgentMemory(userId: string) {
  const db = await loadDb();
  const user = ensureUser(db, userId);
  return {
    episodicEvents: user.episodicEvents,
    semanticMemory: user.semanticMemory
  };
}

export async function deleteMemoryTiers(
  userId: string,
  options: { persistent?: boolean; agent?: boolean; sessionId?: string }
) {
  const db = await loadDb();
  const user = ensureUser(db, userId);

  if (options.persistent) {
    user.persistentSignals = [];
  }

  if (options.agent) {
    user.episodicEvents = [];
    user.semanticMemory = {
      summary: "",
      updatedAt: new Date().toISOString(),
      provenanceEventIds: []
    };
  }

  if (options.sessionId) {
    resetSessionMemory(options.sessionId);
  }

  await saveDb(db);
}

export async function buildMemoryContext(params: {
  userId?: string;
  sessionId: string;
  includePersistent: boolean;
  includeAgent: boolean;
}) {
  const session = getSessionContext(params.sessionId);
  const context: string[] = [];

  if (session.length > 0) {
    context.push(
      "Session memory:\n" +
        session
          .map((turn) => `${turn.role}: ${turn.content}`)
          .join("\n")
    );
  }

  if (params.userId) {
    const db = await loadDb();
    const user = ensureUser(db, params.userId);

    if (params.includePersistent && user.preferences.persistentEnabled) {
      const signals = user.persistentSignals.slice(-15);
      if (signals.length > 0) {
        context.push(
          "Persistent memory:\n" +
            signals
              .map((signal) => `${signal.type}: ${signal.articleId ?? signal.value ?? "n/a"}`)
              .join("\n")
        );
      }
    }

    if (params.includeAgent && user.preferences.agentEnabled) {
      if (user.semanticMemory.summary) {
        context.push(`Semantic memory:\n${user.semanticMemory.summary}`);
      }
      const episodic = user.episodicEvents.slice(-8);
      if (episodic.length > 0) {
        context.push(
          "Episodic memory:\n" + episodic.map((event) => `${event.kind}: ${event.content}`).join("\n")
        );
      }
    }
  }

  return context;
}
