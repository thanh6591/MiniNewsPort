import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

type UserViewEvent = {
  userId: string;
  articleId: number;
  timestamp: string;
};

function getStorePath() {
  return process.env.PERSONALIZATION_STORE_PATH || "./.data/personalization-views.jsonl";
}

export async function recordUserViewEvent(event: UserViewEvent) {
  const filePath = getStorePath();
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

export async function getRecentUserViewArticleIds(userId: string, limit: number) {
  const filePath = getStorePath();
  try {
    const content = await readFile(filePath, "utf8");
    const lines = content.split("\n").filter(Boolean);

    const matched: UserViewEvent[] = [];
    for (let i = lines.length - 1; i >= 0 && matched.length < limit * 3; i -= 1) {
      try {
        const parsed = JSON.parse(lines[i]) as UserViewEvent;
        if (parsed.userId === userId && Number.isInteger(parsed.articleId) && parsed.articleId > 0) {
          matched.push(parsed);
        }
      } catch {
        // Ignore malformed rows and continue.
      }
    }

    const uniqueIds: number[] = [];
    const seen = new Set<number>();
    for (const event of matched) {
      if (!seen.has(event.articleId)) {
        seen.add(event.articleId);
        uniqueIds.push(event.articleId);
      }
      if (uniqueIds.length >= limit) {
        break;
      }
    }

    return uniqueIds;
  } catch {
    return [];
  }
}