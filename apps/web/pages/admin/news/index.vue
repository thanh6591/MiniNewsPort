<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NuxtLink
        to="/admin/news/new"
        class="inline-flex rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >Add News</NuxtLink>

      <p class="text-sm text-slate-500">
        {{ total }} article{{ total === 1 ? '' : 's' }}
        <template v-if="filterCategory || filterStatus"> (filtered)</template>
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-600">Category</label>
        <select
          v-model="filterCategory"
          class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-600">Status</label>
        <select
          v-model="filterStatus"
          class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      <div class="flex items-end">
        <button
          class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
          @click="resetFilters"
        >Reset</button>
      </div>
    </div>

    <!-- List -->
    <div class="space-y-2">
      <p v-if="!news?.length" class="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No articles found.</p>

      <div
        v-for="item in news"
        :key="item.id"
        class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
      >
        <!-- Thumbnail -->
        <div class="hidden shrink-0 sm:block">
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.title"
            class="h-20 w-32 rounded object-cover"
          />
          <div v-else class="flex h-20 w-32 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">No image</div>
        </div>

        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-block rounded px-2 py-0.5 text-xs font-semibold"
              :class="item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
            >{{ item.status }}</span>
            <span class="text-xs text-slate-400">#{{ item.id }}</span>
            <span v-if="item.categorySlug" class="text-xs text-slate-500">{{ item.categorySlug }}</span>
          </div>
          <h3 class="font-semibold text-slate-900">{{ item.title }}</h3>
          <p class="line-clamp-2 text-sm text-slate-600">{{ item.summary }}</p>
          <div class="flex flex-wrap gap-3 text-xs text-slate-400">
            <span>Published: {{ item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '—' }}</span>
            <span>Views: {{ item.viewCount }}</span>
            <span>Created: {{ new Date(item.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>

        <div class="flex shrink-0 flex-wrap gap-2">
          <NuxtLink
            :to="`/admin/news/${item.id}/edit`"
            class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-700"
          >Edit</NuxtLink>
          <button
            class="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
            @click="deleteNews(item.id)"
          >Delete</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between gap-2 pt-2">
      <button
        :disabled="page <= 1"
        class="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        @click="page--"
      >← Prev</button>

      <span class="text-sm text-slate-600">Page {{ page }} / {{ totalPages }}</span>

      <button
        :disabled="page >= totalPages"
        class="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        @click="page++"
      >Next →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  status: string;
  publishedAt: string | null;
  viewCount: number;
  categoryId: number;
  categorySlug: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewsList {
  items: NewsItem[];
  total: number;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

definePageMeta({ middleware: "admin-auth", layout: "admin" });

const LIMIT = 20;
const page = ref(1);
const filterCategory = ref<number | "">("");
const filterStatus = ref("");

const query = computed(() => {
  const q: Record<string, string | number> = { page: page.value, limit: LIMIT };
  if (filterCategory.value) q.categoryId = filterCategory.value;
  if (filterStatus.value) q.status = filterStatus.value;
  return q;
});

const { data: newsData, refresh } = await useFetch<NewsList>("/api/admin/news", { query });
const { data: categoriesData } = await useFetch<{ items: CategoryItem[] }>("/api/admin/categories");

const news = computed(() => newsData.value?.items ?? []);
const total = computed(() => newsData.value?.total ?? 0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)));
const categories = computed(() => categoriesData.value?.items ?? []);

watch([filterCategory, filterStatus], () => { page.value = 1; });

function resetFilters() {
  filterCategory.value = "";
  filterStatus.value = "";
  page.value = 1;
}

async function deleteNews(id: number) {
  if (confirm("Delete this news?")) {
    await $fetch(`/api/admin/news/${id}`, { method: "DELETE" });
    refresh();
  }
}
</script>
