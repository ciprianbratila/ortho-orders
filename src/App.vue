<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from './components/SidebarNav.vue'
import TopBar from './components/TopBar.vue'
import ToastNotifications from './components/ToastNotifications.vue'
import { useMateriiPrimeStore } from './stores/materiiPrime'
import { useClientiStore } from './stores/clienti'
import { useAngajatiStore } from './stores/angajati'
import { useProduseStore } from './stores/produse'
import { useComenziStore } from './stores/comenzi'
import { useFacturiStore } from './stores/facturi'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'

const route = useRoute()
const uiStore = useUiStore()

const isLoginPage = computed(() => route.name === 'login')

// Fetch all data from Supabase on app mount
onMounted(async () => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) {
    await Promise.all([
      auth.fetchAll(),
      useMateriiPrimeStore().fetchAll(),
      useClientiStore().fetchAll(),
      useAngajatiStore().fetchAll(),
      useProduseStore().fetchAll(),
      useComenziStore().fetchAll(),
      useFacturiStore().fetchAll(),
    ])
  }
})
</script>

<template>
  <!-- Login page: no sidebar/topbar -->
  <div v-if="isLoginPage">
    <router-view />
    <ToastNotifications />
  </div>

  <!-- App layout -->
  <div v-else class="app-layout">
    <!-- Overlay for mobile sidebar -->
    <div class="mobile-sidebar-overlay" :class="{ 'active': uiStore.isSidebarOpen }" @click="uiStore.closeSidebar"></div>
    
    <SidebarNav />
    <div class="main-content">
      <TopBar />
      <div class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
    <ToastNotifications />
  </div>
</template>

<style>
/* Global styles are in style.css */
</style>
