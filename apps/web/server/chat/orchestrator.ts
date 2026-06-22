import { buildMemoryContext, getMemoryPreferences, getSessionContext } from "./memory";

export type MemoryMode = "session-only" | "session+persistent" | "session+persistent+agent";

export async function resolveMemoryContext(params: {
  userId?: string;
  sessionId: string;
  includePersistent?: boolean;
  includeAgent?: boolean;
}) {
  if (!params.userId) {
    const session = getSessionContext(params.sessionId);
    return {
      mode: "session-only" as MemoryMode,
      contextBlocks:
        session.length > 0
          ? [
              "Session memory:\n" +
                session.map((turn) => `${turn.role}: ${turn.content}`).join("\n")
            ]
          : []
    };
  }

  const preferences = await getMemoryPreferences(params.userId);
  const includePersistent = (params.includePersistent ?? true) && preferences.persistentEnabled;
  const includeAgent = (params.includeAgent ?? true) && preferences.agentEnabled;

  const contextBlocks = await buildMemoryContext({
    userId: params.userId,
    sessionId: params.sessionId,
    includePersistent,
    includeAgent
  });

  const mode: MemoryMode = includeAgent
    ? "session+persistent+agent"
    : includePersistent
      ? "session+persistent"
      : "session-only";

  return {
    mode,
    contextBlocks
  };
}
