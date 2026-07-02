#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const benchPath =
  process.env.BENCHMARK_PATH ||
  "openspec/changes/migrate-vector-store-to-pgvector/benchmark-latest.json";
const shadowPath =
  process.env.SHADOW_REPORT_PATH ||
  "openspec/changes/migrate-vector-store-to-pgvector/shadow-read-summary.json";
const outputPath =
  process.env.AUDIT_CLOSE_OUTPUT ||
  "openspec/changes/migrate-vector-store-to-pgvector/audit-close.json";

const overlapMin = Number(process.env.VECTOR_CUTOVER_MIN_OVERLAP || "0.70");
const p95Max = Number(process.env.VECTOR_CUTOVER_MAX_P95_MS || "900");
const errorMax = Number(process.env.VECTOR_CUTOVER_MAX_ERROR_RATE || "0.01");

function safeReadJson(path) {
  return readFile(path, "utf8").then((text) => JSON.parse(text));
}

async function run() {
  const [bench, shadow] = await Promise.all([safeReadJson(benchPath), safeReadJson(shadowPath)]);

  const semantic = bench?.results?.semantic_search || {};
  const shadowOps = Array.isArray(shadow?.operations) ? shadow.operations : [];
  const avgOverlap =
    shadowOps.length > 0
      ? shadowOps.reduce((sum, item) => sum + Number(item.overlapAvg || 0), 0) / shadowOps.length
      : 0;

  const checks = {
    overlap: avgOverlap >= overlapMin,
    p95: Number(semantic.p95Ms || 0) <= p95Max,
    errorRate: Number(semantic.errorRate || 1) <= errorMax
  };

  const approved = checks.overlap && checks.p95 && checks.errorRate;

  const report = {
    timestamp: new Date().toISOString(),
    thresholds: {
      overlapMin,
      p95Max,
      errorMax
    },
    observed: {
      overlapAvg: avgOverlap,
      semanticP95Ms: Number(semantic.p95Ms || 0),
      semanticErrorRate: Number(semantic.errorRate || 1)
    },
    checks,
    approved,
    nextAction: approved
      ? "safe_to_continue_cleanup"
      : "keep_shadow_read_and_investigate"
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error("vector audit close failed", error?.message || error);
  process.exit(1);
});
