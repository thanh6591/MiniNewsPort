<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
      <div class="mx-auto flex items-center justify-between p-5">
        <NuxtLink to="/admin" class="text-base font-semibold tracking-tight text-slate-900">Admin Panel</NuxtLink>
        <button
          type="button"
          class="inline-flex p-3 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100"
          aria-label="Toggle admin navigation"
          :aria-expanded="isNavOpen"
          @click="isNavOpen = !isNavOpen"
        >
          <span v-if="!isNavOpen">Menu</span>
          <span v-else>Close</span>
        </button>
      </div>
    </header>

    <div class="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[260px_1fr]">
      <div
        v-if="isNavOpen"
        class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
        aria-hidden="true"
        @click="isNavOpen = false"
      ></div>

      <aside
        class="fixed inset-y-0 left-0 z-40 w-[280px] border-r border-slate-200 bg-white p-6 shadow-xl transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0 lg:border-r"
        :class="isNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      >
        <NuxtLink to="/admin" class="text-lg font-semibold tracking-tight text-slate-900" @click="isNavOpen = false">
          Admin Panel
        </NuxtLink>
        <p class="mt-2 text-sm text-slate-500">Content operations</p>
        <nav class="mt-8 space-y-2">
          <NuxtLink to="/admin" class="block rounded px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900" @click="isNavOpen = false">Dashboard</NuxtLink>
          <NuxtLink to="/admin/categories" class="block rounded px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900" @click="isNavOpen = false">Categories</NuxtLink>
          <NuxtLink to="/admin/news" class="block rounded px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900" @click="isNavOpen = false">News</NuxtLink>
          <NuxtLink to="/admin/imports" class="block rounded px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900" @click="isNavOpen = false">Imports</NuxtLink>
        </nav>
        <button @click="logout" class="mt-8 w-full rounded bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700">Logout</button>
      </aside>

      <main class="p-4 sm:p-6 lg:p-10">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const route = useRoute();
const isNavOpen = ref(false);

watch(() => route.fullPath, () => {
  isNavOpen.value = false;
});

async function logout() {
  await authStore.logout();
  router.push("/");
}
</script>
