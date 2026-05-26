<template>
  <div class="mx-auto w-full max-w-4xl">
    <NewsDetail :article="article" />
  </div>
</template>

<script setup lang="ts">
import type { NewsDetail } from "@mnp/shared";

const route = useRoute();
const slug = route.params.slug as string;

const { data: article } = await useFetch<NewsDetail>(`/api/news/${slug}`);

onMounted(() => {
  const id = article.value?.id;
  if (!id) return;
  $fetch(`/api/news/${id}/view`, { method: "POST" }).catch(() => {});
});
</script>
