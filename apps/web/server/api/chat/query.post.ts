import { chatService } from "~/server/services/chat.service";
import { getOrCreateChatSessionId } from "~/server/chat/session";
import { requireAdmin } from "~/server/utils/auth";
import { getFeatureFlags } from "~/server/utils/feature-flags";

export default defineEventHandler(async (event) => {
  const flags = getFeatureFlags(useRuntimeConfig(event));
  if (!flags.chatbot) {
    throw createError({ statusCode: 503, statusMessage: "Chatbot disabled" });
  }

  const body = (await readBody(event).catch(() => ({}))) as {
    message?: string;
    sessionId?: string;
    includePersistent?: boolean;
    includeAgent?: boolean;
  };

  const sessionId = body.sessionId || getOrCreateChatSessionId(event);

  let userId: string | undefined;
  try {
    const admin = await requireAdmin(event);
    userId = `admin:${admin.username}`;
  } catch {
    userId = undefined;
  }

  return chatService.ask({
    message: body.message || "",
    sessionId,
    userId,
    includePersistent: body.includePersistent,
    includeAgent: body.includeAgent
  });
});
