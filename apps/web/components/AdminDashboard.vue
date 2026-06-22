<template>
  <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-gray-600 text-sm">Total Categories</h3>
      <p class="text-3xl font-bold">{{ categories?.length ?? 0 }}</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-gray-600 text-sm">Total News</h3>
      <p class="text-3xl font-bold">{{ totalNews }}</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-gray-600 text-sm">Published</h3>
      <p class="text-3xl font-bold">{{ publishedCount }}</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-gray-600 text-sm">Drafts</h3>
      <p class="text-3xl font-bold">{{ draftCount }}</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-gray-600 text-sm">Qdrant</h3>
      <p class="text-3xl font-bold" :class="qdrantStatusClass">{{ qdrantStatusLabel }}</p>
      <p class="mt-1 text-xs text-gray-500">{{ qdrantSummary }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category, News } from "@mnp/shared";
import { computed, onMounted, ref } from "vue";

type HealthResponse = {
  status: string;
  checks?: {
    qdrant?: {
      ok?: boolean;
      skipped?: boolean;
      reason?: string;
      url?: string;
      collection?: string;
      latencyMs?: number;
      error?: string;
    };
  };
};

interface NewsList {
  items: News[];
  total: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

const categories = ref<Category[]>([]);
const newsData = ref<NewsList>({ items: [], total: 0 });
const health = ref<HealthResponse | null>(null);

onMounted(async () => {
  const [categoriesResponse, newsResponse, healthResponse] = await Promise.allSettled([
    fetchJson<Category[]>('/api/admin/categories'),
    fetchJson<NewsList>('/api/admin/news'),
    fetchJson<HealthResponse>('/api/health')
  ]);

  if (categoriesResponse.status === 'fulfilled') {
    categories.value = categoriesResponse.value;
  }

  if (newsResponse.status === 'fulfilled') {
    newsData.value = newsResponse.value;
  }

  if (healthResponse.status === 'fulfilled') {
    health.value = healthResponse.value;
  }
});

const totalNews = computed(() => newsData.value.total ?? 0);
const publishedCount = computed(() => newsData.value.items.filter((n: News) => n.status === "PUBLISHED").length);
const draftCount = computed(() => newsData.value.items.filter((n: News) => n.status === "DRAFT").length);
const qdrant = computed(() => health.value?.checks?.qdrant);

const qdrantStatusLabel = computed(() => {
  if (qdrant.value?.skipped) return "Skipped";
  if (qdrant.value?.ok) return "Online";
  return "Down";
});

const qdrantStatusClass = computed(() => {
  if (qdrant.value?.skipped) return "text-gray-500";
  if (qdrant.value?.ok) return "text-emerald-600";
  return "text-red-600";
});

const qdrantSummary = computed(() => {
  if (!qdrant.value) return "Loading health...";
  const parts = [qdrant.value.collection || "articles", qdrant.value.latencyMs ? `${qdrant.value.latencyMs}ms` : ""];
  if (qdrant.value.reason) parts.push(qdrant.value.reason);
  if (qdrant.value.error) parts.push(qdrant.value.error);
  return parts.filter(Boolean).join(" • ");
});
</script>
