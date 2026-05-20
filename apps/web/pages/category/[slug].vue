<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold capitalize tracking-tight text-slate-900 sm:text-3xl">{{ slug }}</h1>

    <p v-if="loadError" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ loadError }}
    </p>

    <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <NewsCard v-for="item in news" :key="item.id" :news="item" />
    </div>

    <p v-if="!isInitialLoading && !news.length && !loadError" class="py-8 text-center text-sm text-slate-500">
      No news found for this category.
    </p>

    <div v-if="hasMore && !loadError" ref="observerTarget" class="py-8 text-center">
      <p v-if="isInitialLoading" class="text-sm text-slate-600">Loading...</p>
      <p v-if="isLoading" class="text-sm text-slate-600">Loading more...</p>
      <p v-else class="text-sm text-slate-500">Scroll for more</p>
    </div>

    <p v-else-if="news.length" class="py-8 text-center text-sm text-slate-500">End of list</p>
  </div>
</template>

<script setup lang="ts">
import type { News } from "@mnp/shared";

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ""));
const newsStore = useNewsStore();
const { target: observerTarget, isLoading } = useInfiniteScroll(loadMore);
const isInitialLoading = ref(false);
const isFetching = ref(false);
const loadError = ref<string | null>(null);
const pageSize = 12;

const news = computed(() => newsStore.newsByCategory[slug.value] ?? []);
const hasMore = computed(() => newsStore.hasMoreByCategory[slug.value] !== false);

async function loadFirstPage() {
  newsStore.resetCategory(slug.value);
  loadError.value = null;
  isInitialLoading.value = true;

  try {
    await loadMore();
  } finally {
    isInitialLoading.value = false;
  }
}

async function loadMore() {
  if (!slug.value || !hasMore.value || isFetching.value) {
    return;
  }

  isFetching.value = true;

  try {
    const nextPage = (newsStore.pagesByCategory[slug.value] ?? 0) + 1;
    const result = await $fetch<{ items: News[]; hasMore: boolean }>("/api/news", {
      query: {
        categorySlug: slug.value,
        page: nextPage,
        limit: pageSize
      }
    });

    newsStore.appendNews(slug.value, result.items, result.hasMore);
    loadError.value = null;
  } catch (error) {
    loadError.value = "Could not load category news. Please try again.";
    throw error;
  } finally {
    isFetching.value = false;
  }
}

watch(slug, async () => {
  await loadFirstPage();
}, {
  immediate: true
});
</script>
