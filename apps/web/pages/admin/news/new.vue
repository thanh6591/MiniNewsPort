<template>
  <div class="max-w-3xl">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Create News</h1>
    <div v-if="submitError || fieldErrors.length" class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p v-if="submitError" class="font-medium">{{ submitError }}</p>
      <ul v-if="fieldErrors.length" class="mt-2 space-y-1">
        <li v-for="item in fieldErrors" :key="item.field">
          <span class="font-medium">{{ toDisplayField(item.field) }}:</span>
          {{ item.message }}
          <span v-if="item.expected"> Expected: {{ item.expected }}.</span>
          <span v-if="item.example"> Example: {{ item.example }}.</span>
        </li>
      </ul>
    </div>
    <form @submit.prevent="save" class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <input
          v-model="form.title"
          type="text"
          placeholder="Title"
          :class="inputClass('title')"
          required
        />
        <p v-if="fieldMessage('title')" class="mt-1 text-xs text-red-600">{{ fieldMessage("title") }}</p>
      </div>

      <div>
        <input
          v-model="form.slug"
          type="text"
          placeholder="Slug"
          :class="inputClass('slug')"
          required
        />
        <p v-if="fieldMessage('slug')" class="mt-1 text-xs text-red-600">{{ fieldMessage("slug") }}</p>
      </div>

      <div>
        <textarea
          v-model="form.summary"
          placeholder="Summary"
          :class="inputClass('summary')"
          required
        ></textarea>
        <p v-if="fieldMessage('summary')" class="mt-1 text-xs text-red-600">{{ fieldMessage("summary") }}</p>
      </div>

      <div>
        <textarea
          v-model="form.content"
          placeholder="Content"
          :class="inputClass('content', 'h-48')"
          required
        ></textarea>
        <p v-if="fieldMessage('content')" class="mt-1 text-xs text-red-600">{{ fieldMessage("content") }}</p>
      </div>

      <div>
        <input
          v-model="form.imageUrl"
          type="url"
          placeholder="Image URL"
          :class="inputClass('imageUrl')"
        />
        <p v-if="fieldMessage('imageUrl')" class="mt-1 text-xs text-red-600">{{ fieldMessage("imageUrl") }}</p>
      </div>

      <div>
        <select v-model="form.categoryId" :class="inputClass('categoryId')" required>
          <option value="">Select Category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <p v-if="fieldMessage('categoryId')" class="mt-1 text-xs text-red-600">{{ fieldMessage("categoryId") }}</p>
      </div>

      <div>
        <select v-model="form.status" :class="inputClass('status')">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <p v-if="fieldMessage('status')" class="mt-1 text-xs text-red-600">{{ fieldMessage("status") }}</p>
      </div>

      <div v-if="form.status === 'PUBLISHED'">
        <input
          v-model="form.publishedAt"
          type="datetime-local"
          :class="inputClass('publishedAt')"
        />
        <p v-if="fieldMessage('publishedAt')" class="mt-1 text-xs text-red-600">{{ fieldMessage("publishedAt") }}</p>
      </div>

      <button type="submit" class="w-full rounded bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700">Create</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { Category } from "@mnp/shared";

type ValidationDetail = {
  field: string;
  message: string;
  expected?: string;
  example?: string;
};

interface CategoryListResponse {
  items: Category[];
}

definePageMeta({ middleware: "admin-auth", layout: "admin" });

const router = useRouter();
const { data: categoryData } = await useFetch<CategoryListResponse>("/api/admin/categories");
const categories = computed(() => categoryData.value?.items ?? []);
const submitError = ref("");
const fieldErrors = ref<ValidationDetail[]>([]);

const form = ref({
  title: "",
  slug: "",
  summary: "",
  content: "",
  imageUrl: "",
  categoryId: "",
  status: "DRAFT",
  publishedAt: ""
});

async function save() {
  submitError.value = "";
  fieldErrors.value = [];

  try {
    await $fetch("/api/admin/news", {
      method: "POST",
      body: {
        ...form.value,
        categoryId: Number(form.value.categoryId),
        publishedAt: form.value.publishedAt ? new Date(form.value.publishedAt) : null
      }
    });
    router.push("/admin/news");
  } catch (error: any) {
    const apiError = normalizeApiError(error);
    submitError.value = apiError.message || "Could not create news.";
    fieldErrors.value = apiError.details;
  }
}

function normalizeApiError(error: any): { message: string; details: ValidationDetail[] } {
  const payload = error?.data ?? {};
  const errorObject = payload?.error && typeof payload.error === "object" ? payload.error : null;
  const dataObject = payload?.data && typeof payload.data === "object" ? payload.data : null;
  const candidate = errorObject ?? dataObject ?? payload;

  const message =
    candidate?.message ??
    payload?.statusMessage ??
    error?.statusMessage ??
    "";

  const details = Array.isArray(candidate?.details)
    ? candidate.details
    : Array.isArray(payload?.details)
      ? payload.details
      : [];

  return { message, details };
}

function toDisplayField(field: string) {
  return field
    .replace(/^(body|query|params)\./, "")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase();
}

function fieldMessage(field: string) {
  const detail = fieldErrors.value.find((item) => item.field === `body.${field}` || item.field === field);
  if (!detail) {
    return "";
  }

  const suffix = [
    detail.expected ? `Expected: ${detail.expected}.` : "",
    detail.example ? `Example: ${detail.example}.` : ""
  ].filter(Boolean).join(" ");

  return suffix ? `${detail.message} ${suffix}` : detail.message;
}

function inputClass(field: string, extra = "") {
  return [
    "w-full rounded border px-3 py-2 text-sm",
    fieldMessage(field) ? "border-red-400 bg-red-50" : "border-slate-300",
    extra
  ];
}
</script>
