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

    <div
      v-if="news.length > 0"
      class="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="flex items-center gap-2">
        <input
          id="select-all-news"
          type="checkbox"
          :checked="allVisibleSelected"
          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          @change="toggleSelectAllVisible"
        />
        <label for="select-all-news" class="text-sm text-slate-700">Select all on page</label>
      </div>

      <span class="text-sm text-slate-500">{{ selectedIds.length }} selected</span>

      <div class="ml-auto flex flex-wrap items-end gap-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-slate-600">Change category to</label>
          <select
            v-model="bulkCategoryId"
            class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option :value="null" disabled>Select category</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <button
          class="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          :disabled="bulkProcessing || selectedIds.length === 0 || bulkCategoryId == null"
          @click="bulkChangeCategory"
        >
          {{ bulkProcessing ? 'Processing…' : 'Update category' }}
        </button>

        <button
          class="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          :disabled="bulkProcessing || selectedIds.length === 0"
          @click="bulkDelete"
        >
          {{ bulkProcessing ? 'Processing…' : 'Delete selected' }}
        </button>
      </div>
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
        <div class="flex items-start pt-1">
          <input
            :id="`select-news-${item.id}`"
            type="checkbox"
            :checked="selectedSet.has(item.id)"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            @change="toggleItemSelection(item.id)"
          />
        </div>

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
const selectedSet = ref<Set<number>>(new Set());
const bulkCategoryId = ref<number | null>(null);
const bulkProcessing = ref(false);

const selectedIds = computed(() => Array.from(selectedSet.value));
const allVisibleSelected = computed(() => news.value.length > 0 && news.value.every((item) => selectedSet.value.has(item.id)));

watch([filterCategory, filterStatus], () => { page.value = 1; });
watch(news, (items) => {
  const visibleIds = new Set(items.map((item) => item.id));
  selectedSet.value = new Set(Array.from(selectedSet.value).filter((id) => visibleIds.has(id)));
});

function resetFilters() {
  filterCategory.value = "";
  filterStatus.value = "";
  page.value = 1;
}

function toggleItemSelection(id: number) {
  const next = new Set(selectedSet.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedSet.value = next;
}

function toggleSelectAllVisible(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (!checked) {
    selectedSet.value = new Set();
    return;
  }

  selectedSet.value = new Set(news.value.map((item) => item.id));
}

function clearSelection() {
  selectedSet.value = new Set();
}

async function deleteNews(id: number) {
  if (confirm("Delete this news?")) {
    await $fetch(`/api/admin/news/${id}`, { method: "DELETE" });
    refresh();
  }
}

async function bulkDelete() {
  if (selectedIds.value.length === 0) {
    return;
  }

  if (!confirm(`Delete ${selectedIds.value.length} selected article(s)?`)) {
    return;
  }

  bulkProcessing.value = true;
  try {
    await $fetch("/api/admin/news/bulk-delete", {
      method: "POST",
      body: { ids: selectedIds.value }
    });
    clearSelection();
    await refresh();
  } finally {
    bulkProcessing.value = false;
  }
}

async function bulkChangeCategory() {
  if (selectedIds.value.length === 0 || bulkCategoryId.value == null) {
    return;
  }

  bulkProcessing.value = true;
  try {
    await $fetch("/api/admin/news/bulk-category", {
      method: "PUT",
      body: {
        ids: selectedIds.value,
        categoryId: bulkCategoryId.value
      }
    });
    clearSelection();
    await refresh();
  } finally {
    bulkProcessing.value = false;
  }
}
</script>
