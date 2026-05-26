<template>
  <NuxtLink
    :to="`/news/${news.slug}`"
    class="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
  >
    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
      <img v-if="news.imageUrl" :src="news.imageUrl" :alt="news.title" class="h-44 w-full object-cover sm:h-48" />
      <div class="space-y-2 p-4">
        <h3 class="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-blue-700 sm:text-lg">{{ news.title }}</h3>
        <p class="line-clamp-3 text-sm text-slate-600">{{ news.summary }}</p>
        <p class="text-xs text-slate-500">{{ news.publishedAt ? new Date(news.publishedAt).toLocaleDateString() : 'Draft' }}</p>
      </div>
    </article>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { News } from "@mnp/shared";

defineProps<{
  news: News;
}>();
</script>
