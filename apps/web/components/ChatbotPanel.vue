<template>
  <div class="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
    <section
      v-show="isOpen"
      class="mb-3 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
      data-testid="chatbot-panel"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold tracking-tight text-slate-900">Article Chatbot</h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            data-testid="chat-reset-button"
            @click="resetSession"
          >
            Reset
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            @click="isOpen = false"
          >
            Close
          </button>
        </div>
      </div>

      <p class="mb-3 text-xs text-slate-500" data-testid="chat-memory-mode">Memory mode: {{ memoryMode }}</p>

      <div ref="messagesContainer" class="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3" data-testid="chat-messages">
        <p v-if="messages.length === 0" class="text-sm text-slate-500">Ask about any article topic.</p>
        <div v-for="(msg, index) in messages" :key="index" class="flex" :class="isUserRole(msg.role) ? 'justify-end' : 'justify-start'">
          <div
            class="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
            :class="isUserRole(msg.role)
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-800'"
          >
            <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{{ displayRole(msg.role) }}</p>
            <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <input
          v-model="prompt"
          type="text"
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Ask about latest events..."
          data-testid="chat-input"
          :disabled="isSending"
          @keydown.enter.prevent="send"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          data-testid="chat-send"
          :disabled="isSending"
          @click="send"
        >
          {{ isSending ? "..." : "Send" }}
        </button>
      </div>

      <div v-if="followUps.length === 3" class="mt-3" data-testid="chat-followups">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Follow-up questions</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(item, index) in followUps"
            :key="index"
            type="button"
            class="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            @click="prompt = item"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </section>

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      data-testid="chat-launcher"
      :aria-label="isOpen ? 'Close chatbot' : 'Open chatbot'"
      @click="isOpen = !isOpen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.7 4.1A.75.75 0 0 1 3 19.54V5.5Z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

type ChatMessage = { role: string; content: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const prompt = ref("");
const sessionId = ref<string | null>(null);
const memoryMode = ref("session-only");
const messages = ref<ChatMessage[]>([]);
const followUps = ref<string[]>([]);
const isOpen = ref(false);
const isSending = ref(false);
const isComposing = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

function isUserRole(role: string) {
  return role.toLowerCase() === "user";
}

function displayRole(role: string) {
  return isUserRole(role) ? "You" : "Assistant";
}

async function scrollToLatestMessage() {
  await nextTick();
  if (!messagesContainer.value) return;
  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
}

async function loadMemoryState() {
  const state = await fetchJson<{ sessionId: string; memoryMode: string }>("/api/chat/memory");
  sessionId.value = state.sessionId;
  memoryMode.value = state.memoryMode;
}

async function resetSession() {
  await fetchJson("/api/chat/memory/reset", {
    method: "POST",
    body: JSON.stringify({
      sessionId: sessionId.value
    })
  });
  messages.value = [];
  followUps.value = [];
  await loadMemoryState();
}

async function send() {
  const text = prompt.value.trim();
  if (!text || isSending.value || isComposing.value) return;

  messages.value.push({ role: "user", content: text });
  prompt.value = "";
  isSending.value = true;

  try {
    const response = await fetchJson<{
      answer: string;
      followUpQuestions: string[];
      memoryMode: string;
      sessionId: string;
    }>("/api/chat/query", {
      method: "POST",
      body: JSON.stringify({
        message: text,
        sessionId: sessionId.value
      })
    });

    sessionId.value = response.sessionId;
    memoryMode.value = response.memoryMode;
    messages.value.push({ role: "assistant", content: response.answer });
    followUps.value = (response.followUpQuestions || []).slice(0, 3);
  } catch {
    messages.value.push({
      role: "assistant",
      content: "Sorry, I could not get a response right now. Please try again."
    });
  } finally {
    isSending.value = false;
  }
}

onMounted(loadMemoryState);

watch(messages, () => {
  scrollToLatestMessage();
}, { deep: true });
</script>
