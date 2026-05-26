import type { QueueAdapter } from "./types";
import { InProcessQueueAdapter } from "./in-process";

let instance: QueueAdapter | null = null;
let creating: Promise<QueueAdapter> | null = null;

async function buildAdapter(): Promise<QueueAdapter> {
  const redisUrl = process.env.REDIS_URL ?? "";
  if (redisUrl) {
    try {
      const { BullMqQueueAdapter } = await import("./bullmq");
      return new BullMqQueueAdapter(redisUrl);
    } catch (err) {
      console.warn("[queue] Failed to load BullMQ adapter; falling back to in-process", err);
    }
  }
  return new InProcessQueueAdapter();
}

export async function getQueueAdapter(): Promise<QueueAdapter> {
  if (instance) return instance;
  if (!creating) {
    creating = buildAdapter().then((adapter) => {
      instance = adapter;
      return adapter;
    });
  }
  return creating;
}

export function __setQueueAdapterForTests(adapter: QueueAdapter | null): void {
  instance = adapter;
  creating = null;
}

export async function closeQueueAdapter(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
    creating = null;
  }
}
