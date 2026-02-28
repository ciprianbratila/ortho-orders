<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from './components/SidebarNav.vue'
import TopBar from './components/TopBar.vue'
import ToastNotifications from './components/ToastNotifications.vue'

const route = useRoute()

const isLoginPage = computed(() => route.name === 'login')
</script>

<template>
  <!-- Login page: no sidebar/topbar -->
  <div v-if="isLoginPage">
    <router-view />
    <ToastNotifications />
  </div>

  <!-- App layout -->
  <div v-else class="app-layout">
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
