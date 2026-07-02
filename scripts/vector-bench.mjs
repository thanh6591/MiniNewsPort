#!/usr/bin/env node

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const baseUrl = process.env.BENCH_BASE_URL || "http://127.0.0.1:3010";
const slug = process.env.BENCH_SLUG || "";
const query = process.env.BENCH_QUERY || "tin tuc cong nghe";
const iterations = Math.max(5, Number.parseInt(process.env.BENCH_ITERATIONS || "20", 10) || 20);
const outputPath =
  process.env.BENCH_OUTPUT ||
  "openspec/changes/migrate-vector-store-to-pgvector/benchmark-latest.json";

async function timedFetch(url) {
  const started = performance.now();
  try {
    const response = await fetch(url);
    const latencyMs = performance.now() - started;
    return {
      ok: response.ok,
      status: response.status,
      latencyMs
    };
  } catch {
    return {
      ok: false,
      status: 0,
      latencyMs: performance.now() - started
    };
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function summarize(operation, samples) {
  const latencies = samples.map((item) => item.latencyMs);
  const errors = samples.filter((item) => !item.ok).length;

  return {
    operation,
    sampleCount: samples.length,
    errorCount: errors,
    errorRate: samples.length > 0 ? errors / samples.length : 0,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    maxMs: latencies.length > 0 ? Math.max(...latencies) : 0
  };
}

async function run() {
  const semanticSamples = [];
  const similarSamples = [];

  for (let index = 0; index < iterations; index += 1) {
    const semanticUrl = `${baseUrl}/api/news/search?q=${encodeURIComponent(query)}&limit=6`;
    semanticSamples.push(await timedFetch(semanticUrl));

    if (slug) {
      const similarUrl = `${baseUrl}/api/news/similar/${encodeURIComponent(slug)}?limit=6`;
      similarSamples.push(await timedFetch(similarUrl));
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl,
      slug,
      query,
      iterations
    },
    results: {
      semantic_search: summarize("semantic_search", semanticSamples),
      article_recommendations: summarize("article_recommendations", similarSamples)
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error("vector benchmark failed", error);
  process.exit(1);
});
