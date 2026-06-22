<template>
  <div class="space-y-8">
    <!-- ─── Manual URL Import ─────────────────────────── -->
    <section class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Bulk URL Import</h2>
        <p class="mt-1 text-sm text-slate-500">
          Paste up to 100 URLs (one per line), choose a category, then submit.
          Scraping runs asynchronously — you'll be redirected to the progress dashboard.
        </p>
      </div>

      <form class="space-y-5 rounded border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="onSubmit">
        <div>
          <label for="urls" class="block text-sm font-medium text-slate-700">URLs</label>
          <textarea
            id="urls"
            v-model="urlsText"
            rows="12"
            class="mt-1 w-full rounded border border-slate-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/article-1&#10;https://example.com/article-2"
          ></textarea>
          <p class="mt-1 text-xs" :class="lineCount > 100 ? 'text-red-600' : 'text-slate-500'">
            {{ lineCount }} / 100 lines
          </p>
        </div>

        <div>
          <label for="category" class="block text-sm font-medium text-slate-700">Category</label>
          <select
            id="category"
            v-model.number="categoryId"
            class="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option :value="null" disabled>Select a category…</option>
            <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <div v-if="errorMessage" class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="submitting || lineCount === 0 || lineCount > 100 || !categoryId"
          >
            {{ submitting ? 'Submitting…' : 'Submit batch' }}
          </button>
          <span class="text-xs text-slate-500">Returns 202 Accepted; progress shown on next screen.</span>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useCategoriesStore } from "../../../stores/categories";

definePageMeta({ middleware: "admin-auth", layout: "admin" });

const router = useRouter();
const categoriesStore = useCategoriesStore();

// ─── Manual URL import state ────────────────────────────
const urlsText = ref("");
const categoryId = ref<number | null>(null);
const submitting = ref(false);
const errorMessage = ref<string | null>(null);

const lineCount = computed(() =>
  urlsText.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length
);

const validCategoryIds = computed(() => new Set(categoriesStore.categories.map((cat) => cat.id)));

onMounted(async () => {
  await categoriesStore.fetchCategories();

  if (categoriesStore.categories.length === 0) {
    categoryId.value = null;
    return;
  }

  if (categoryId.value == null || !validCategoryIds.value.has(categoryId.value)) {
    categoryId.value = categoriesStore.categories[0]?.id ?? null;
  }
});

async function onSubmit() {
  errorMessage.value = null;

  if (categoryId.value == null || !validCategoryIds.value.has(categoryId.value)) {
    errorMessage.value = "Please select a valid category";
    return;
  }

  submitting.value = true;
  try {
    const response = await $fetch<{ batchId: number; acceptedCount: number; skippedCount: number }>(
      "/api/admin/imports/bulk",
      {
        method: "POST",
        body: { urls: urlsText.value, categoryId: categoryId.value }
      }
    );
    router.push(`/admin/imports/${response.batchId}`);
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string; message?: string };
    errorMessage.value = e?.data?.message || e?.statusMessage || e?.message || "Submission failed";
  } finally {
    submitting.value = false;
  }
}
</script>
