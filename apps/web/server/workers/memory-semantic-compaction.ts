import { readFile } from "node:fs/promises";
import { rebuildSemanticMemory } from "~/server/chat/memory";

function memoryPath() {
  return process.env.MEMORY_STORE_PATH || "./.data/chat-memory.json";
}

async function listUserIds() {
  try {
    const content = await readFile(memoryPath(), "utf8");
    const parsed = JSON.parse(content) as { users?: Record<string, unknown> };
    return Object.keys(parsed.users || {});
  } catch {
    return [];
  }
}

async function run() {
  const userIds = await listUserIds();
  let rebuilt = 0;

  for (const userId of userIds) {
    await rebuildSemanticMemory(userId);
    rebuilt += 1;
  }

  console.info(`[memory-compaction] rebuilt semantic memory for ${rebuilt} user(s)`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[memory-compaction] fatal error", error);
    process.exit(1);
  });
