<template>
  <section class="mx-auto max-w-7xl space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Architecture Diagram Center</h1>
      <p class="text-sm text-slate-600 sm:text-base">Open each diagram to understand how the system works by layer, security flow, and API validation.</p>
    </header>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <NuxtLink to="/diagrams/layered-architecture" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow">
        <h2 class="text-lg font-semibold text-slate-900">Layered Architecture</h2>
        <p class="mt-2 text-sm text-slate-600">Transport, Service, and Persistence responsibilities in one diagram.</p>
      </NuxtLink>

      <NuxtLink to="/diagrams/security-jwt" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow">
        <h2 class="text-lg font-semibold text-slate-900">Security (JWT)</h2>
        <p class="mt-2 text-sm text-slate-600">Stateless authentication flow for backoffice login and protected endpoints.</p>
      </NuxtLink>

      <NuxtLink to="/diagrams/error-validation" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow">
        <h2 class="text-lg font-semibold text-slate-900">Error & Validation</h2>
        <p class="mt-2 text-sm text-slate-600">Input validation and specific HTTP status behavior for create/edit news.</p>
      </NuxtLink>

      <NuxtLink to="/diagrams/bulk-import-messaging" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow">
        <h2 class="text-lg font-semibold text-slate-900">Bulk Import & Messaging</h2>
        <p class="mt-2 text-sm text-slate-600">Detailed queue flow with a beginner-friendly backend deep-dive tab for code-level learning.</p>
      </NuxtLink>
    </div>
    
  </section>
</template>
