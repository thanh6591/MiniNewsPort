<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" data-testid="semantic-search-section">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div class="flex-1 space-y-1">
        <label for="semantic-query" class="text-sm font-medium text-slate-700">Semantic Search</label>
        <input
          id="semantic-query"
          v-model="query"
          type="text"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search by natural language..."
          data-testid="semantic-search-input"
          @keydown.enter.prevent="runSearch"
        />
      </div>

      <div class="space-y-1 sm:w-56">
        <label for="semantic-category" class="text-sm font-medium text-slate-700">Category</label>
        <select
          id="semantic-category"
          v-model="selectedCategory"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          data-testid="semantic-search-category"
        >
          <option value="">All categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.slug">{{ cat.name }}</option>
        </select>
      </div>

      <button
        type="button"
        class="flex min-w-[88px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        data-testid="semantic-search-button"
        :disabled="loading"
        @click="runSearch"
      >
        <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
        </svg>
        <span v-else>Search</span>
      </button>
    </div>

    <p v-if="metadata" class="mt-3 text-xs text-slate-500" data-testid="semantic-search-metadata">
      Strategy: {{ metadata.strategy }}<span v-if="metadata.fallback"> (fallback)</span>
    </p>

    <div v-if="loading" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="semantic-search-loading">
      <div v-for="n in 3" :key="n" class="animate-pulse overflow-hidden rounded-xl border border-slate-200">
        <div class="h-40 w-full bg-slate-200"></div>
        <div class="space-y-2 p-4">
          <div class="h-4 w-3/4 rounded bg-slate-200"></div>
          <div class="h-3 w-full rounded bg-slate-100"></div>
          <div class="h-3 w-5/6 rounded bg-slate-100"></div>
        </div>
      </div>
    </div>

    <div v-else-if="results.length > 0" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="semantic-search-results">
      <NewsCard v-for="item in results" :key="item.id" :news="item" />
    </div>

    <p v-else-if="searched" class="mt-4 text-sm text-slate-500" data-testid="semantic-search-empty">No matching articles.</p>
  </section>
</template>

<script setup lang="ts">
import type { Category, News } from "@mnp/shared";
import { ref } from "vue";

defineProps<{
  categories: Category[];
}>();

const query = ref("");
const selectedCategory = ref("");
const results = ref<News[]>([]);
const metadata = ref<{ fallback?: boolean; strategy?: string } | null>(null);
const searched = ref(false);
const loading = ref(false);

async function runSearch() {
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    metadata.value = null;
    searched.value = false;
    return;
  }

  const params = new URLSearchParams({
    q,
    limit: "9"
  });
  if (selectedCategory.value) {
    params.set("categorySlug", selectedCategory.value);
  }

  loading.value = true;
  try {
    const response = await fetch(`/api/news/search?${params.toString()}`).then((res) => {
      if (!res.ok) {
        throw new Error("Semantic search request failed");
      }
      return res.json() as Promise<{ items: News[]; metadata?: { fallback?: boolean; strategy?: string } }>;
    });

    results.value = response.items || [];
    metadata.value = response.metadata || null;
    searched.value = true;
  } finally {
    loading.value = false;
  }
}
</script>
