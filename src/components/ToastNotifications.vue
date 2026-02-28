<script setup lang="ts">
import { useToastStore } from '../stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        <span class="material-icons-outlined">
          {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'warning' }}
        </span>
        <span style="font-size: 0.88rem;">{{ toast.message }}</span>
        <button
          class="btn btn-ghost btn-icon"
          style="margin-left: auto; padding: 4px;"
          @click="toastStore.remove(toast.id)"
        >
          <span class="material-icons-outlined" style="font-size: 16px;">close</span>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active {
  animation: slideInRight 300ms ease;
}
.toast-leave-active {
  animation: fadeOut 200ms ease;
}
</style>
