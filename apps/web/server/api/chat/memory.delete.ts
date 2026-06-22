import { deleteMemoryTiers } from "~/server/chat/memory";
import { requireAdmin } from "~/server/utils/auth";
import { getOrCreateChatSessionId } from "~/server/chat/session";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = (await readBody(event).catch(() => ({}))) as {
    persistent?: boolean;
    agent?: boolean;
    session?: boolean;
    sessionId?: string;
  };

  const sessionId = body.session ? (body.sessionId || getOrCreateChatSessionId(event)) : undefined;

  await deleteMemoryTiers(`admin:${admin.username}`, {
    persistent: body.persistent,
    agent: body.agent,
    sessionId
  });

  return {
    deleted: true,
    sessionId: sessionId || null
  };
});