<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Import batch #{{ batchId }}</h1>
        <p class="mt-1 text-sm text-slate-500">Progress refreshes automatically every 3 seconds.</p>
      </div>
      <NuxtLink to="/admin/imports" class="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        New batch
      </NuxtLink>
    </header>

    <section v-if="progress" class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div class="rounded border border-slate-200 bg-white p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Total</div>
        <div class="mt-1 text-2xl font-semibold">{{ progress.totalCount }}</div>
      </div>
      <div class="rounded border border-slate-200 bg-white p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Pending</div>
        <div class="mt-1 text-2xl font-semibold text-slate-700">{{ progress.pendingCount }}</div>
      </div>
      <div class="rounded border border-slate-200 bg-white p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Processing</div>
        <div class="mt-1 text-2xl font-semibold text-blue-600">{{ progress.processingCount }}</div>
      </div>
      <div class="rounded border border-slate-200 bg-white p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Published</div>
        <div class="mt-1 text-2xl font-semibold text-green-600">{{ progress.publishedCount }}</div>
      </div>
      <div class="rounded border border-slate-200 bg-white p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Failed</div>
        <div class="mt-1 text-2xl font-semibold text-red-600">{{ progress.failedCount }}</div>
      </div>
    </section>

    <section v-if="progress" class="overflow-hidden rounded border border-slate-200 bg-white">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">URL</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Attempts</th>
            <th class="px-4 py-3">Preview</th>
            <th class="px-4 py-3">Reason</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in progress.items" :key="item.id">
            <td class="max-w-md truncate px-4 py-2 font-mono text-xs text-slate-700">
              <a :href="item.sourceUrl" target="_blank" rel="noopener" class="hover:underline">{{ item.sourceUrl }}</a>
            </td>
            <td class="px-4 py-2">
              <span class="rounded px-2 py-1 text-xs font-medium" :class="statusClass(item.status)">{{ item.status }}</span>
            </td>
            <td class="px-4 py-2 text-slate-700">{{ item.attempts }}</td>
            <td class="max-w-xs truncate px-4 py-2 text-xs">
              <NuxtLink
                v-if="item.status === 'PUBLISHED' && item.newsSlug"
                :to="`/news/${item.newsSlug}`"
                target="_blank"
                class="text-blue-600 hover:underline"
                :title="item.newsTitle || ''"
              >
                {{ item.newsTitle || item.newsSlug }}
              </NuxtLink>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="px-4 py-2 text-xs text-red-600">{{ item.failureReason || "" }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-else-if="errorMessage" class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>
    <div v-else class="text-sm text-slate-500">Loading…</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin-auth", layout: "admin" });

type ProgressItem = {
  id: number;
  sourceUrl: string;
  status: "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED";
  attempts: number;
  failureReason: string | null;
  newsId: number | null;
  newsSlug: string | null;
  newsTitle: string | null;
};
type ProgressResponse = {
  id: number;
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  publishedCount: number;
  failedCount: number;
  items: ProgressItem[];
};

const route = useRoute();
const batchId = computed(() => Number(route.params.batchId));
const progress = ref<ProgressResponse | null>(null);
const errorMessage = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
  try {
    progress.value = await $fetch<ProgressResponse>(`/api/admin/imports/${batchId.value}`);
    errorMessage.value = null;
    if (
      progress.value &&
      progress.value.pendingCount === 0 &&
      progress.value.processingCount === 0 &&
      timer
    ) {
      clearInterval(timer);
      timer = null;
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string };
    errorMessage.value = e?.data?.message || e?.statusMessage || "Failed to load progress";
  }
}

function statusClass(status: ProgressItem["status"]): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-green-100 text-green-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

onMounted(() => {
  void load();
  timer = setInterval(() => void load(), 3000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
