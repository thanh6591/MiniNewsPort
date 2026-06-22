import { requireAdmin } from "~/server/utils/auth";
import { updateMemoryPreferences } from "~/server/chat/memory";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = (await readBody(event).catch(() => ({}))) as {
    persistentEnabled?: boolean;
    agentEnabled?: boolean;
  };

  const preferences = await updateMemoryPreferences(`admin:${admin.username}`, {
    persistentEnabled: typeof body.persistentEnabled === "boolean" ? body.persistentEnabled : undefined,
    agentEnabled: typeof body.agentEnabled === "boolean" ? body.agentEnabled : undefined
  });

  return {
    updated: true,
    preferences
  };
});