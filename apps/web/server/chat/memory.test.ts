import { afterEach, describe, expect, it } from "vitest";
import {
  addEpisodicEvent,
  addPersistentSignal,
  appendSessionTurn,
  buildMemoryContext,
  deleteMemoryTiers,
  getMemoryPreferences,
  getSessionContext,
  resetSessionMemory,
  updateMemoryPreferences
} from "./memory";

const testStorePath = "./.data/test-chat-memory.json";

async function cleanup() {
  const { rm } = await import("node:fs/promises");
  await rm(testStorePath, { force: true });
}

describe("chat memory governance", () => {
  afterEach(async () => {
    process.env.MEMORY_STORE_PATH = testStorePath;
    await cleanup();
    resetSessionMemory("s1");
  });

  it("supports session append and reset", async () => {
    appendSessionTurn("s1", "user", "hello");
    appendSessionTurn("s1", "assistant", "hi");

    expect(getSessionContext("s1")).toHaveLength(2);
    resetSessionMemory("s1");
    expect(getSessionContext("s1")).toHaveLength(0);
  });

  it("respects consent when persistent memory is disabled", async () => {
    await updateMemoryPreferences("admin:test", { persistentEnabled: false });
    const result = await addPersistentSignal("admin:test", {
      type: "article_view",
      articleId: 10
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("persistent_disabled");
  });

  it("creates semantic memory from episodic events and supports tier deletion", async () => {
    await addEpisodicEvent("admin:test", {
      kind: "chat",
      content: "user asked about AI chips",
      source: "chat"
    });

    const contextBeforeDelete = await buildMemoryContext({
      userId: "admin:test",
      sessionId: "s1",
      includePersistent: true,
      includeAgent: true
    });

    expect(contextBeforeDelete.some((block) => block.includes("Semantic memory"))).toBe(true);

    await deleteMemoryTiers("admin:test", { agent: true });

    const contextAfterDelete = await buildMemoryContext({
      userId: "admin:test",
      sessionId: "s1",
      includePersistent: true,
      includeAgent: true
    });

    expect(contextAfterDelete.some((block) => block.includes("Semantic memory"))).toBe(false);
  });

  it("returns default preferences and updates them", async () => {
    const defaults = await getMemoryPreferences("admin:test");
    expect(defaults.persistentEnabled).toBe(true);
    expect(defaults.agentEnabled).toBe(true);

    const updated = await updateMemoryPreferences("admin:test", { agentEnabled: false });
    expect(updated.agentEnabled).toBe(false);
  });
});
