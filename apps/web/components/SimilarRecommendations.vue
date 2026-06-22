<template>
  <section class="space-y-6" data-testid="article-recommendations-section">
    <div>
      <h2 class="mb-3 text-xl font-semibold tracking-tight text-slate-900">Similar In This Category</h2>
      <div v-if="inCategory.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NewsCard v-for="item in inCategory" :key="item.id" :news="item" />
      </div>
      <p v-else class="text-sm text-slate-500">No in-category recommendations yet.</p>
    </div>

    <div>
      <h2 class="mb-3 text-xl font-semibold tracking-tight text-slate-900">You Might Also Explore</h2>
      <div v-if="global.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NewsCard v-for="item in global" :key="item.id" :news="item" />
      </div>
      <p v-else class="text-sm text-slate-500">No cross-category recommendations yet.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { News } from "@mnp/shared";

defineProps<{
  inCategory: News[];
  global: News[];
}>();
</script>
