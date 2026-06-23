<template>
  <div class="space-y-8 sm:space-y-10">
    <SemanticSearchSection :categories="categories ?? []" />
    <PersonalizedRecommendations />
    <!-- <MostViewedToday :news="mostViewed ?? []" /> -->
    <section class="space-y-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Latest News</h1>
      <p v-if="loadError" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {{ loadError }}
      </p>
      <div class="space-y-8 sm:space-y-10">
        <CategorySection v-for="cat in categories ?? []" :key="cat.id" :category="cat" :news="categoriesNews[cat.id] ?? []" />
      </div>
    </section>
    <ChatbotPanel />
  </div>
</template>

<script setup lang="ts">
import type { Category, News } from "@mnp/shared";
import { onMounted, ref } from "vue";

type MostViewedItem = {
  newsId: number;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  viewCount: number;
  totalViewCount: number;
  publishedAt: string | Date | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

const categories = ref<Category[]>([]);
const mostViewed = ref<MostViewedItem[]>([]);
const categoriesNews = ref<Record<number, News[]>>({});
const loadError = ref("");

onMounted(async () => {
  try {
    categories.value = await fetchJson<Category[]>("/api/categories");
    mostViewed.value = await fetchJson<MostViewedItem[]>("/api/news/most-viewed-today").catch(() => []);
  } catch {
    loadError.value = "Unable to load posts right now. Please check that database services are running.";
    categories.value = [];
    categoriesNews.value = {};
    return;
  }

  const newsByCategory = await Promise.all(
    categories.value.map(async (cat) => {
      const data = await fetchJson<{ items: News[] }>(`/api/news?categoryId=${cat.id}&limit=5`).catch(() => ({ items: [] }));

      return [cat.id, data.items || []] as const;
    })
  );

  categoriesNews.value = Object.fromEntries(newsByCategory);
});

</script>
