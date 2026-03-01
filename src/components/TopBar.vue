<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const uiStore = useUiStore()

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
      <button class="btn btn-ghost btn-icon mobile-menu-btn" title="Meniu" @click="uiStore.openSidebar">
        <span class="material-icons-outlined">menu</span>
      </button>
      <div>
        <h2>{{ pageTitle }}</h2>
        <p class="top-bar-date">{{ currentDate }}</p>
      </div>
    </div>
    <div class="top-bar-right">
      <button class="btn btn-ghost btn-icon" title="Notificări">
        <span class="material-icons-outlined">notifications</span>
      </button>
      <button class="btn btn-ghost btn-icon" title="Setări">
        <span class="material-icons-outlined">settings</span>
      </button>
    </div>
  </header>
</template>
