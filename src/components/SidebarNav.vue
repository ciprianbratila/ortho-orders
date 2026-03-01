<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComenziStore } from '../stores/comenzi'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { useUiStore } from '../stores/ui'
import type { ModulAcces } from '../types'

const route = useRoute()
const router = useRouter()
const comenziStore = useComenziStore()
const auth = useAuthStore()
const toast = useToastStore()
const uiStore = useUiStore()

const showProfileModal = ref(false)
const showPasswordForm = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordLoading = ref(false)

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

function openProfile() {
  showPasswordForm.value = false
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  showProfileModal.value = true
}

async function savePassword() {
  if (!passwordForm.value.newPassword) {
    toast.error('Introduceți parola nouă!')
    return
  }
  if (passwordForm.value.newPassword.length < 4) {
    toast.error('Parola trebuie să aibă cel puțin 4 caractere!')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.error('Parolele nu coincid!')
    return
  }

  passwordLoading.value = true
  const result = await auth.changePassword(
    passwordForm.value.currentPassword,
    passwordForm.value.newPassword
  )
  passwordLoading.value = false

  if (result.success) {
    toast.success('Parola a fost schimbată cu succes!')
    showPasswordForm.value = false
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } else {
    toast.error(result.error || 'Eroare la schimbarea parolei.')
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ 'mobile-open': uiStore.isSidebarOpen }">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <span class="material-icons-outlined">medical_services</span>
        </div>
        <div class="sidebar-logo-text">
          <h1>OrthoOrders</h1>
          <span>Management Comenzi</span>
        </div>
        <button class="btn btn-ghost btn-icon close-sidebar-btn" @click="uiStore.closeSidebar" style="margin-left: auto;">
          <span class="material-icons-outlined">close</span>
        </button>
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
        @click="uiStore.closeSidebar"
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
          @click="uiStore.closeSidebar"
        >
          <span class="material-icons-outlined">admin_panel_settings</span>
          Administrare
        </router-link>
      </template>
    </nav>
    <div style="padding: 16px 20px; border-top: 1px solid var(--border-color);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div
          @click="openProfile"
          style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.72rem; color: white; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;"
          :style="{ background: auth.isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }"
          title="Profil utilizator"
          class="user-avatar-btn"
        >{{ auth.currentUser?.prenume?.[0] || '' }}{{ auth.currentUser?.nume?.[0] || '' }}</div>
        <div style="flex: 1; min-width: 0; cursor: pointer;" @click="openProfile">
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

    <!-- ====== Profile Modal ====== -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal" style="width: min(480px, 90vw);">
        <div class="modal-header">
          <h3>Profil Utilizator</h3>
          <button class="btn btn-ghost btn-icon" @click="showProfileModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- User Info -->
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
            <div
              style="width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; color: white; flex-shrink: 0;"
              :style="{ background: auth.isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }"
            >{{ auth.currentUser?.prenume?.[0] || '' }}{{ auth.currentUser?.nume?.[0] || '' }}</div>
            <div>
              <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                {{ auth.currentUser?.prenume }} {{ auth.currentUser?.nume }}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 2px;">
                @{{ auth.currentUser?.username }}
              </div>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; background: rgba(16, 185, 129, 0.12); color: #10b981;">
                {{ auth.currentGroup?.denumire }}
              </span>
            </div>
          </div>

          <!-- Info Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Username</div>
              <div style="font-size: 0.88rem; color: var(--text-primary);">{{ auth.currentUser?.username }}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Email</div>
              <div style="font-size: 0.88rem; color: var(--text-primary);">{{ auth.currentUser?.email || '—' }}</div>
            </div>
          </div>

          <!-- Divider -->
          <div style="border-top: 1px solid var(--border-color); margin-bottom: 16px;"></div>

          <!-- Password Section -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <div style="font-size: 0.92rem; font-weight: 600; color: var(--text-primary);">Securitate</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">Gestionează parola contului</div>
              </div>
              <button
                v-if="!showPasswordForm"
                class="btn btn-secondary btn-sm"
                @click="showPasswordForm = true"
              >
                <span class="material-icons-outlined" style="font-size: 16px;">lock</span>
                Schimbă Parola
              </button>
            </div>

            <div v-if="showPasswordForm" style="padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <div class="form-group">
                <label class="form-label">Parola curentă</label>
                <input
                  v-model="passwordForm.currentPassword"
                  class="form-input"
                  type="password"
                  placeholder="Introdu parola curentă..."
                  autocomplete="current-password"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Parola nouă</label>
                <input
                  v-model="passwordForm.newPassword"
                  class="form-input"
                  type="password"
                  placeholder="Parola nouă (min. 4 caractere)..."
                  autocomplete="new-password"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Confirmă parola nouă</label>
                <input
                  v-model="passwordForm.confirmPassword"
                  class="form-input"
                  type="password"
                  placeholder="Repeta parola nouă..."
                  autocomplete="new-password"
                />
              </div>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" @click="showPasswordForm = false">Anulează</button>
                <button class="btn btn-primary btn-sm" @click="savePassword" :disabled="passwordLoading">
                  <span class="material-icons-outlined" style="font-size: 16px;">{{ passwordLoading ? 'hourglass_empty' : 'save' }}</span>
                  {{ passwordLoading ? 'Se salvează...' : 'Salvează' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.user-avatar-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3);
}
</style>
