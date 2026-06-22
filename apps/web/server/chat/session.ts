import { getCookie, setCookie } from "h3";
import { randomUUID } from "node:crypto";

export function getOrCreateChatSessionId(event: any) {
  const existing = getCookie(event, "mnp_chat_session");
  if (existing) {
    return existing;
  }

  const created = randomUUID();
  setCookie(event, "mnp_chat_session", created, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
  return created;
}
