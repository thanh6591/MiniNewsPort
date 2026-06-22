import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function telemetryPath() {
  return process.env.TELEMETRY_LOG_PATH || "./.data/telemetry.jsonl";
}

export async function logTelemetry(event: string, data: Record<string, unknown>) {
  const path = telemetryPath();
  await mkdir(dirname(path), { recursive: true });
  const record = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
}
