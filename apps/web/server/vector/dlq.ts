import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type VectorDlqEvent = {
  operation: "upsert" | "delete" | "backfill";
  articleId?: number;
  reason: string;
  context?: Record<string, unknown>;
  timestamp?: string;
};

function getDlqPath() {
  return process.env.VECTOR_DLQ_PATH || "./.data/vector-dlq.jsonl";
}

export async function logVectorDlq(event: VectorDlqEvent) {
  const filePath = getDlqPath();
  await mkdir(dirname(filePath), { recursive: true });

  const record = {
    timestamp: event.timestamp || new Date().toISOString(),
    operation: event.operation,
    articleId: event.articleId,
    reason: event.reason,
    context: event.context || {}
  };

  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}
