<template>
  <div class="mx-auto w-full max-w-4xl space-y-8">
    <NewsDetail v-if="article" :article="article" />
    <SimilarRecommendations :in-category="recommendations.inCategory" :global="recommendations.global" />
  </div>
</template>

<script setup lang="ts">
import type { News, NewsDetail } from "@mnp/shared";
import { computed, onMounted, ref } from "vue";

function getCurrentSlug() {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.at(-1) || "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const slug = ref("");

const article = ref<NewsDetail | null>(null);
const recommendationResponse = ref<{ inCategory: News[]; global: News[] } | null>(null);

const recommendations = computed(() => ({
  inCategory: recommendationResponse.value?.inCategory ?? [],
  global: recommendationResponse.value?.global ?? []
}));

onMounted(() => {
  slug.value = getCurrentSlug();
  if (!slug.value) return;

  Promise.all([
    fetchJson<NewsDetail>(`/api/news/${slug.value}`).then((data) => {
      article.value = data;
      return data;
    }),
    fetchJson<{ inCategory: News[]; global: News[] }>(`/api/news/${slug.value}/recommendations?limit=4`).then((data) => {
      recommendationResponse.value = data;
      return data;
    })
  ])
    .then(async ([detail]) => {
      const response = await fetch(`/api/news/${detail.id}/view`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`View request failed: ${response.status}`);
      }
    })
    .then(() => {
      if (article.value) {
        article.value.viewCount += 1;
      }
    })
    .catch(() => {
      // Keep the page usable even when recommendation/view APIs fail.
    });
});
</script>
