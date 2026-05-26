import { describe, it, expect, beforeEach, vi } from "vitest";
import { InProcessQueueAdapter } from "./in-process";

describe("InProcessQueueAdapter", () => {
  let adapter: InProcessQueueAdapter;

  beforeEach(() => {
    adapter = new InProcessQueueAdapter();
  });

  it("delivers a published job to the consumer", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    adapter.consume<{ x: number }>("q1", { concurrency: 1 }, handler);
    await adapter.publish("q1", { x: 42 });
    await adapter.drain("q1");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toEqual({ x: 42 });
  });

  it("retries with backoff and gives up after maxAttempts, sending to DLQ", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const dlqHandler = vi.fn().mockResolvedValue(undefined);
    adapter.consume<unknown>("dlq", { concurrency: 1 }, dlqHandler);
    adapter.consume<unknown>(
      "main",
      { concurrency: 1, maxAttempts: 3, backoffMs: 1, backoffType: "fixed", deadLetterQueue: "dlq" },
      handler
    );
    await adapter.publish("main", { hello: "world" });
    await new Promise((r) => setTimeout(r, 50));
    await adapter.drain("main");
    await adapter.drain("dlq");
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(dlqHandler).toHaveBeenCalledTimes(1);
    const payload = dlqHandler.mock.calls[0]?.[0] as { originalQueue: string; reason: string };
    expect(payload.originalQueue).toBe("main");
    expect(payload.reason).toBe("boom");
  });

  it("non-retryable errors go directly to DLQ", async () => {
    const handler = vi.fn().mockImplementation(async () => {
      const e = new Error("nope") as Error & { retryable: boolean };
      e.retryable = false;
      throw e;
    });
    const dlqHandler = vi.fn().mockResolvedValue(undefined);
    adapter.consume<unknown>("dlq2", { concurrency: 1 }, dlqHandler);
    adapter.consume<unknown>(
      "main2",
      { concurrency: 1, maxAttempts: 5, backoffMs: 1, backoffType: "fixed", deadLetterQueue: "dlq2" },
      handler
    );
    await adapter.publish("main2", { a: 1 });
    await adapter.drain("main2");
    await adapter.drain("dlq2");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(dlqHandler).toHaveBeenCalledTimes(1);
  });
});
