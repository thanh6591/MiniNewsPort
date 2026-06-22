<template>
  <section v-if="items.length > 0" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" data-testid="personalized-section">
    <h2 class="mb-3 text-xl font-semibold tracking-tight text-slate-900">Articles You May Like</h2>
    <p class="mb-4 text-xs text-slate-500" data-testid="personalized-metadata">
      <span v-if="metadata?.personalized">Personalized for your reading history</span>
      <span v-else>Showing fallback recommendations</span>
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NewsCard v-for="item in items" :key="item.id" :news="item" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { News } from "@mnp/shared";
import { onMounted, ref } from "vue";

const items = ref<News[]>([]);
const metadata = ref<Record<string, any> | null>(null);

onMounted(async () => {
  try {
    const response = await fetch("/api/news/recommendations/personalized?limit=6").then((res) => {
      if (!res.ok) {
        throw new Error("Personalized recommendation request failed");
      }
      return res.json() as Promise<{ items: News[]; metadata?: Record<string, any> }>;
    });

    items.value = response.items || [];
    metadata.value = response.metadata || null;
  } catch {
    // Endpoint requires authentication; keep section hidden when unavailable.
    items.value = [];
    metadata.value = null;
  }
});
</script>
