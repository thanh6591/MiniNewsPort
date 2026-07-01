<template>
  <div class="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
    <Transition name="chat-panel">
      <section
        v-show="isOpen"
        class="mb-3 flex h-[calc(100vh-22rem)] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:h-[calc(100vh-13rem)] sm:p-5"
        data-testid="chatbot-panel"
      >
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold tracking-tight text-slate-900">Chatbot</h2>
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

        <div ref="messagesContainer" class="mb-3 flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3" data-testid="chat-messages">
          <p v-if="messages.length === 0" class="text-sm text-slate-500">Ask about any article topic.</p>

          <div v-for="(msg, index) in messages" :key="index" class="flex" :class="isUserRole(msg.role) ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              :class="isUserRole(msg.role) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80" :class="isUserRole(msg.role) ? 'text-right' : 'text-left'">
                {{ displayRole(msg.role) }}
              </p>
              <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>

              <Transition name="related-posts-fade">
                <div v-if="!isUserRole(msg.role) && visibleRelatedPosts(msg).length" class="mt-3 border-t border-slate-200 pt-3">
                  <p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">3 bài liên quan</p>
                  <TransitionGroup name="related-post-card" tag="div" class="space-y-2">
                    <NuxtLink
                      v-for="post in visibleRelatedPosts(msg)"
                      :key="post.id"
                      :to="`/news/${post.slug}`"
                      class="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <p class="line-clamp-2 text-sm font-semibold text-slate-900">{{ post.title }}</p>
                      <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ post.summary || 'Đọc chi tiết bài viết này.' }}</p>
                    </NuxtLink>
                  </TransitionGroup>
                </div>
              </Transition>
            </div>
          </div>

          <div v-if="streamingAssistant" class="flex justify-start" data-testid="chat-streaming-answer">
            <div class="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-800">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-left opacity-80">Assistant</p>
              <p class="whitespace-pre-wrap break-words">{{ streamingAssistant.content }}</p>
            </div>
          </div>

          <div v-if="isSending" class="flex justify-start" data-testid="chat-typing">
            <div class="flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2.5">
              <span class="chat-dot"></span>
              <span class="chat-dot" style="animation-delay: 0.15s"></span>
              <span class="chat-dot" style="animation-delay: 0.3s"></span>
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
            class="flex min-w-[64px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            data-testid="chat-send"
            :disabled="isSending"
            @click="send"
          >
            <svg v-if="isSending" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
            </svg>
            <span v-else>Send</span>
          </button>
        </div>
      </section>
    </Transition>

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform duration-200 hover:bg-blue-700 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      data-testid="chat-launcher"
      :aria-label="isOpen ? 'Close chatbot' : 'Open chatbot'"
      @click="isOpen = !isOpen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7 transition-transform duration-300" :class="isOpen ? 'rotate-90 scale-90' : ''">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.7 4.1A.75.75 0 0 1 3 19.54V5.5Z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

type ChatArticleCard = {
  id: number;
  slug: string;
  title: string;
  summary?: string;
  thumbnail: string | null;
};

type ChatMessage = { role: string; content: string; relatedPosts?: ChatArticleCard[]; relatedVisibleCount?: number };

type ChatResponse = {
  answer: string;
  memoryMode: string;
  sessionId: string;
  supportingArticles: ChatArticleCard[];
  recommendedArticles: ChatArticleCard[];
};

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
const isOpen = ref(false);
const isSending = ref(false);
const isComposing = ref(false);
const streamingAssistant = ref<ChatMessage | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
let revealTimer: ReturnType<typeof setInterval> | null = null;
let relatedRevealTimer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null = null;

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

function stopRevealTimer() {
  if (revealTimer) {
    clearInterval(revealTimer);
    revealTimer = null;
  }
}

function stopRelatedRevealTimer() {
  if (relatedRevealTimer) {
    clearTimeout(relatedRevealTimer);
    clearInterval(relatedRevealTimer);
    relatedRevealTimer = null;
  }
}

function collectRelatedPosts(response: Pick<ChatResponse, "supportingArticles" | "recommendedArticles">) {
  const combined = [...response.supportingArticles, ...response.recommendedArticles];
  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = item.slug || String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

function visibleRelatedPosts(message: ChatMessage) {
  const visibleCount = message.relatedVisibleCount ?? 0;
  return (message.relatedPosts || []).slice(0, visibleCount);
}

async function revealAnswerWordByWord(answer: string, relatedPosts: ChatArticleCard[]) {
  stopRevealTimer();
  stopRelatedRevealTimer();
  streamingAssistant.value = { role: "assistant", content: "" };

  const chunks = answer.match(/\S+\s*/g) || [answer];
  let index = 0;

  await new Promise<void>((resolve) => {
    revealTimer = setInterval(() => {
      if (!streamingAssistant.value) {
        stopRevealTimer();
        resolve();
        return;
      }

      streamingAssistant.value.content += chunks[index] || "";
      index += 1;

      if (index >= chunks.length) {
        stopRevealTimer();
        resolve();
      }
    }, 28);
  });

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: answer,
    relatedPosts,
    relatedVisibleCount: 0
  };

  messages.value.push(assistantMessage);
  streamingAssistant.value = null;

  const assistantIndex = messages.value.length - 1;

  relatedRevealTimer = setTimeout(() => {
    const currentMessage = messages.value[assistantIndex];
    const posts = currentMessage?.relatedPosts || [];
    if (posts.length === 0) {
      relatedRevealTimer = null;
      return;
    }

    messages.value[assistantIndex].relatedVisibleCount = 1;
    scrollToLatestMessage();

    const step = () => {
      const target = messages.value[assistantIndex];
      if (!target) {
        stopRelatedRevealTimer();
        return;
      }

      const currentCount = target.relatedVisibleCount || 0;
      if (currentCount >= posts.length) {
        stopRelatedRevealTimer();
        return;
      }

      messages.value[assistantIndex].relatedVisibleCount = currentCount + 1;
      scrollToLatestMessage();
    };

    relatedRevealTimer = setInterval(step, 240);
  }, 220);
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
  await loadMemoryState();
}

async function send() {
  const text = prompt.value.trim();
  if (!text || isSending.value || isComposing.value) return;

  stopRevealTimer();
  stopRelatedRevealTimer();
  streamingAssistant.value = null;
  messages.value.push({ role: "user", content: text });
  prompt.value = "";
  isSending.value = true;

  try {
    const response = await fetchJson<ChatResponse>("/api/chat/query", {
      method: "POST",
      body: JSON.stringify({
        message: text,
        sessionId: sessionId.value
      })
    });

    sessionId.value = response.sessionId;
    memoryMode.value = response.memoryMode;
    await revealAnswerWordByWord(response.answer, collectRelatedPosts(response));
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

onBeforeUnmount(() => {
  stopRevealTimer();
  stopRelatedRevealTimer();
});

watch(messages, () => {
  scrollToLatestMessage();
}, { deep: true });

watch(streamingAssistant, () => {
  scrollToLatestMessage();
}, { deep: true });
</script>

<style scoped>
.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  transform-origin: bottom right;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}

.chat-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background-color: #94a3b8;
  display: inline-block;
  animation: chat-bounce 1s infinite ease-in-out;
}

.related-posts-fade-enter-active,
.related-posts-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.related-posts-fade-enter-from,
.related-posts-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.related-post-card-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.related-post-card-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes chat-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

</style>
