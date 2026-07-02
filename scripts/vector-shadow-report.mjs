#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const telemetryPath = process.env.TELEMETRY_LOG_PATH || ".data/telemetry.jsonl";
const outputPath =
  process.env.SHADOW_REPORT_OUTPUT ||
  "openspec/changes/migrate-vector-store-to-pgvector/shadow-read-summary.json";

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function summarizeOperation(operation, rows) {
  const overlap = rows.map((row) => Number(row.overlapAtK || 0));
  const primaryLatency = rows.map((row) => Number(row.primaryLatencyMs || 0));
  const shadowLatency = rows.map((row) => Number(row.shadowLatencyMs || 0));
  const shadowErrors = rows.filter((row) => row.shadowError).length;

  return {
    operation,
    sampleCount: rows.length,
    overlapAvg: overlap.length > 0 ? overlap.reduce((a, b) => a + b, 0) / overlap.length : 0,
    overlapP50: percentile(overlap, 0.5),
    overlapP95: percentile(overlap, 0.95),
    primaryP95Ms: percentile(primaryLatency, 0.95),
    shadowP95Ms: percentile(shadowLatency, 0.95),
    shadowErrorRate: rows.length > 0 ? shadowErrors / rows.length : 0
  };
}

async function run() {
  const raw = await readFile(telemetryPath, "utf8");
  const records = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((item) => item && item.event === "vector_shadow_read");

  const grouped = new Map();
  for (const record of records) {
    const operation = String(record.operation || "unknown");
    if (!grouped.has(operation)) grouped.set(operation, []);
    grouped.get(operation).push(record);
  }

  const operations = [];
  for (const [operation, rows] of grouped.entries()) {
    operations.push(summarizeOperation(operation, rows));
  }

  const report = {
    timestamp: new Date().toISOString(),
    telemetryPath,
    totalSamples: records.length,
    operations
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error("vector shadow report failed", error?.message || error);
  process.exit(1);
});
