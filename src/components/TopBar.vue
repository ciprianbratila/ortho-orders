<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = computed(() => {
  return (route.meta?.title as string) || 'Dashboard'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <header class="top-bar">
    <div class="top-bar-left">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ currentDate }}</p>
      </div>
    </div>
    <div class="top-bar-right">
      <div class="search-box">
        <span class="material-icons-outlined">search</span>
        <input type="text" placeholder="Caută..." />
      </div>
      <button class="btn btn-ghost btn-icon" title="Notificări">
        <span class="material-icons-outlined">notifications</span>
      </button>
      <button class="btn btn-ghost btn-icon" title="Setări">
        <span class="material-icons-outlined">settings</span>
      </button>
    </div>
  </header>
</template>
