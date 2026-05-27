<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <h2 class="mb-4 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Most Viewed Today</h2>

    <p v-if="!featured" class="text-sm text-slate-500">No views yet today.</p>

    <div v-else class="space-y-4">
      <NuxtLink
        :to="`/news/${featured.slug}`"
        class="grid gap-4 border-b border-slate-200 pb-4 transition md:grid-cols-12 md:gap-6"
      >
        <div class="overflow-hidden rounded-lg bg-slate-100 md:col-span-7">
          <img
            v-if="featured.imageUrl"
            :src="featured.imageUrl"
            :alt="featured.title"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex aspect-[16/9] items-center justify-center text-sm text-slate-500">No image</div>
        </div>

        <div class="space-y-2 md:col-span-5">
          <h3 class="line-clamp-3 text-2xl font-semibold leading-tight text-slate-900">{{ featured.title }}</h3>
          <p class="line-clamp-4 text-base leading-relaxed text-slate-700">{{ featured.summary }}</p>
          <p class="text-sm text-slate-500">
            {{ formatPublishedAt(featured.publishedAt) }} • {{ featured.viewCount }} views today • {{ featured.totalViewCount }} total views
          </p>
        </div>
      </NuxtLink>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NuxtLink
          v-for="item in secondary"
          :key="item.newsId"
          :to="`/news/${item.slug}`"
          class="space-y-2 transition"
        >
          <div class="overflow-hidden rounded-lg bg-slate-100">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.title"
              class="aspect-[16/10] w-full object-cover"
            />
            <div v-else class="flex aspect-[16/10] items-center justify-center text-xs text-slate-500">No image</div>
          </div>
          <h4 class="line-clamp-3 text-xl font-semibold leading-tight text-slate-900">{{ item.title }}</h4>
          <p class="line-clamp-3 text-base text-slate-700">{{ item.summary }}</p>
          <p class="text-sm text-slate-500">{{ item.viewCount }} today • {{ item.totalViewCount }} total</p>
        </NuxtLink>
      </div>

      <div v-if="extra.length > 0" class="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
        <NuxtLink
          v-for="item in extra"
          :key="item.newsId"
          :to="`/news/${item.slug}`"
          class="line-clamp-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
        >
          {{ item.title }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type MostViewedItem = {
  newsId: number;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  viewCount: number;
  totalViewCount: number;
  publishedAt: string | Date | null;
};

const props = defineProps<{
  news: MostViewedItem[];
}>();

const featured = computed(() => props.news[0] ?? null);
const secondary = computed(() => props.news.slice(1, 4));
const extra = computed(() => props.news.slice(4));

function formatPublishedAt(value: string | Date | null) {
  if (!value) {
    return "Draft";
  }

  return new Date(value).toLocaleDateString();
}
</script>
