<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        @click="openAddForm"
      >
        Add Category
      </button>
    </div>

    <!-- Add / Edit form -->
    <form
      v-if="formVisible"
      class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      @submit.prevent="saveForm"
    >
      <h3 class="text-sm font-semibold text-slate-700">{{ editingId != null ? "Edit category" : "New category" }}</h3>
      <input
        v-model="form.name"
        type="text"
        placeholder="Category Name"
        class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        required
      />
      <input
        v-model="form.slug"
        type="text"
        placeholder="Category Slug"
        class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        required
      />
      <div class="flex gap-2">
        <button type="submit" class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700">
          Save
        </button>
        <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100" @click="cancelForm">
          Cancel
        </button>
      </div>
    </form>

    <!-- Bulk action bar -->
    <div
      v-if="categories.length > 0"
      class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <input
        id="select-all-cats"
        type="checkbox"
        :checked="allSelected"
        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        @change="toggleSelectAll"
      />
      <label for="select-all-cats" class="text-sm text-slate-700">Select all</label>
      <span class="text-sm text-slate-500">{{ selectedIds.length }} selected</span>
      <button
        v-if="selectedIds.length > 0"
        class="ml-auto rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        :disabled="bulkProcessing"
        @click="bulkDelete"
      >
        {{ bulkProcessing ? "Deleting…" : `Delete ${selectedIds.length} selected` }}
      </button>
    </div>

    <!-- Category list -->
    <div class="space-y-2">
      <p v-if="categories.length === 0" class="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No categories yet.
      </p>

      <div
        v-for="cat in categories"
        :key="cat.id"
        class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        :class="selectedSet.has(cat.id) ? 'border-blue-400 bg-blue-50' : ''"
      >
        <div class="flex items-center gap-3">
          <input
            :id="`cat-${cat.id}`"
            type="checkbox"
            :checked="selectedSet.has(cat.id)"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            @change="toggleItem(cat.id)"
          />
          <div>
            <h3 class="font-semibold text-slate-900">{{ cat.name }} ({{ getNewsCount(cat) }} news)</h3>
            <p class="text-sm text-slate-500">{{ cat.slug }}</p>
          </div>
        </div>

        <div class="flex shrink-0 gap-2 self-start sm:self-auto">
          <button
            class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-700"
            @click="openEditForm(cat)"
          >Edit</button>
          <button
            class="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
            @click="deleteCategory(cat.id)"
          >Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category } from "@mnp/shared";

interface CategoryListResponse {
  items: Category[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

definePageMeta({ middleware: "admin-auth", layout: "admin" });

const { data: categoryData, refresh } = await useFetch<CategoryListResponse>("/api/admin/categories");
const categories = computed(() => categoryData.value?.items ?? []);

// ── Form state ──────────────────────────────────────────────────────────────
const formVisible = ref(false);
const editingId = ref<number | null>(null);
const form = ref({ name: "", slug: "" });

function openAddForm() {
  editingId.value = null;
  form.value = { name: "", slug: "" };
  formVisible.value = true;
}

function openEditForm(cat: Category) {
  editingId.value = cat.id;
  form.value = { name: cat.name, slug: cat.slug };
  formVisible.value = true;
}

function cancelForm() {
  formVisible.value = false;
  editingId.value = null;
  form.value = { name: "", slug: "" };
}

async function saveForm() {
  if (editingId.value != null) {
    await $fetch(`/api/admin/categories/${editingId.value}`, {
      method: "PUT",
      body: form.value
    });
  } else {
    await $fetch("/api/admin/categories", {
      method: "POST",
      body: form.value
    });
  }
  cancelForm();
  refresh();
}

// ── Single delete ────────────────────────────────────────────────────────────
async function deleteCategory(id: number) {
  if (confirm("Delete this category?")) {
    await $fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    refresh();
  }
}

// ── Multi-select ─────────────────────────────────────────────────────────────
const selectedSet = ref<Set<number>>(new Set());
const bulkProcessing = ref(false);

const selectedIds = computed(() => Array.from(selectedSet.value));
const allSelected = computed(() =>
  categories.value.length > 0 && categories.value.every((cat) => selectedSet.value.has(cat.id))
);

function toggleItem(id: number) {
  const next = new Set(selectedSet.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedSet.value = next;
}

function toggleSelectAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  selectedSet.value = checked ? new Set(categories.value.map((cat) => cat.id)) : new Set();
}

async function bulkDelete() {
  if (selectedIds.value.length === 0) return;
  if (!confirm(`Delete ${selectedIds.value.length} selected category(ies)?`)) return;

  bulkProcessing.value = true;
  try {
    await Promise.all(selectedIds.value.map((id) => $fetch(`/api/admin/categories/${id}`, { method: "DELETE" })));
    selectedSet.value = new Set();
    await refresh();
  } finally {
    bulkProcessing.value = false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getNewsCount(category: Category) {
  return ((category as Category & { newsCount?: number }).newsCount ?? 0);
}
</script>
