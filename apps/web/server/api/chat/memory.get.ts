import { requireAdmin } from "~/server/utils/auth";
import { getOrCreateChatSessionId } from "~/server/chat/session";
import { getMemoryPreferences, getSessionContext } from "~/server/chat/memory";
import { resolveMemoryContext } from "~/server/chat/orchestrator";

export default defineEventHandler(async (event) => {
  const sessionId = getOrCreateChatSessionId(event);

  let userId: string | undefined;
  try {
    const admin = await requireAdmin(event);
    userId = `admin:${admin.username}`;
  } catch {
    userId = undefined;
  }

  const memory = await resolveMemoryContext({
    userId,
    sessionId
  });

  return {
    sessionId,
    memoryMode: memory.mode,
    sessionTurnCount: getSessionContext(sessionId).length,
    preferences: userId ? await getMemoryPreferences(userId) : null
  };
});