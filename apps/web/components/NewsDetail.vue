<template>
  <article v-if="article" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
    <img v-if="article.imageUrl" :src="article.imageUrl" :alt="article.title" class="mb-5 h-56 w-full rounded-xl object-cover sm:h-72 lg:h-80" />
    <h1 class="mb-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">{{ article.title }}</h1>
    <p class="mb-5 text-sm text-slate-600">{{ article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Draft' }} • {{ article.viewCount }} views</p>
    <div class="prose max-w-none text-slate-800 mb-6" v-html="article.content"></div>
    <NewerOlderNav :newer-slug="article.newerSlug" :older-slug="article.olderSlug" />
  </article>
</template>

<script setup lang="ts">
import type { NewsDetail } from "@mnp/shared";

defineProps<{
  article: NewsDetail | null;
}>();
</script>
