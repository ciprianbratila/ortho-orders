<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComenziStore } from '../stores/comenzi'
import { useAuthStore } from '../stores/auth'
import type { ModulAcces } from '../types'

const route = useRoute()
const router = useRouter()
const comenziStore = useComenziStore()
const auth = useAuthStore()

const allNavItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', module: 'dashboard' as ModulAcces },
  { to: '/comenzi', label: 'Comenzi', icon: 'shopping_cart', module: 'comenzi' as ModulAcces, badgeKey: 'comenziActive' },
  { to: '/facturi', label: 'Facturi', icon: 'receipt_long', module: 'facturi' as ModulAcces },
  { to: '/clienti', label: 'Clienți', icon: 'people', module: 'clienti' as ModulAcces },
  { to: '/angajati', label: 'Angajați', icon: 'badge', module: 'angajati' as ModulAcces },
  { to: '/produse', label: 'Produse', icon: 'category', module: 'produse' as ModulAcces },
  { to: '/materii-prime', label: 'Materii Prime', icon: 'inventory_2', module: 'materii-prime' as ModulAcces },
]

const navItems = computed(() =>
  allNavItems.filter(item => auth.hasAccess(item.module))
)

const showAdminLink = computed(() => auth.hasAccess('admin'))

function isActive(path: string): boolean {
  return route.path === path
}

const comenziActiveBadge = computed(() => comenziStore.comenziActive.length || 0)

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <span class="material-icons-outlined">medical_services</span>
        </div>
        <div class="sidebar-logo-text">
          <h1>OrthoOrders</h1>
          <span>Management Comenzi</span>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Meniu Principal</div>
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <span class="material-icons-outlined">{{ item.icon }}</span>
        {{ item.label }}
        <span
          v-if="item.badgeKey && comenziActiveBadge > 0"
          class="nav-badge"
        >
          {{ comenziActiveBadge }}
        </span>
      </router-link>

      <template v-if="showAdminLink">
        <div class="nav-section-title" style="margin-top: 12px;">Sistem</div>
        <router-link
          to="/admin"
          class="nav-item"
          :class="{ active: isActive('/admin') }"
        >
          <span class="material-icons-outlined">admin_panel_settings</span>
          Administrare
        </router-link>
      </template>
    </nav>
    <div style="padding: 16px 20px; border-top: 1px solid var(--border-color);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div
          style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.72rem; color: white;"
          :style="{ background: auth.isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }"
        >{{ auth.currentUser?.prenume?.[0] || '' }}{{ auth.currentUser?.nume?.[0] || '' }}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.82rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ auth.currentUser?.prenume }} {{ auth.currentUser?.nume }}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">{{ auth.currentGroup?.denumire }}</div>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" @click="handleLogout" title="Deconectare" style="color: var(--error);">
          <span class="material-icons-outlined" style="font-size: 20px;">logout</span>
        </button>
      </div>
    </div>
  </aside>
</template>
