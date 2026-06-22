import { resetSessionMemory } from "~/server/chat/memory";
import { getOrCreateChatSessionId } from "~/server/chat/session";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as { sessionId?: string };
  const sessionId = body.sessionId || getOrCreateChatSessionId(event);

  resetSessionMemory(sessionId);
  return {
    reset: true,
    sessionId
  };
});