<template>
  <div class="space-y-8 sm:space-y-10">
    <MostViewedToday :news="mostViewed ?? []" />
    <section class="space-y-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Latest News</h1>
      <div class="space-y-8 sm:space-y-10">
        <CategorySection v-for="cat in categories ?? []" :key="cat.id" :category="cat" :news="categoriesNews[cat.id] ?? []" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Category, News } from "@mnp/shared";

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

const { data: categories } = await useFetch<Category[]>("/api/categories");
const { data: mostViewed } = await useFetch<MostViewedItem[]>("/api/news/most-viewed-today");

const categoriesNews = ref<Record<number, News[]>>({});

for (const cat of categories.value ?? []) {
  const { data } = await useFetch<{ items: News[] }>(`/api/news`, {
    query: {
      categoryId: cat.id,
      limit: 5
    }
  });

  if (data.value?.items) {
    categoriesNews.value[cat.id] = data.value.items;
  }
}
</script>
