<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  if (!username.value.trim()) {
    errorMsg.value = 'Introduceți numele de utilizator!'
    return
  }
  if (!password.value) {
    errorMsg.value = 'Introduceți parola!'
    return
  }
  loading.value = true
  // Simulate async
  await new Promise(resolve => setTimeout(resolve, 600))
  const result = auth.login(username.value.trim(), password.value)
  loading.value = false
  if (result.success) {
    router.push('/')
  } else {
    errorMsg.value = result.error || 'Eroare la autentificare'
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg-pattern"></div>
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <span class="material-icons-outlined">medical_services</span>
        </div>
        <h1>OrthoOrders</h1>
        <p>Management Comenzi Ortopedice</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="errorMsg" class="login-error">
          <span class="material-icons-outlined">error_outline</span>
          {{ errorMsg }}
        </div>

        <div class="login-field">
          <span class="material-icons-outlined login-field-icon">person</span>
          <input
            v-model="username"
            type="text"
            placeholder="Utilizator"
            autocomplete="username"
            autofocus
          />
        </div>

        <div class="login-field">
          <span class="material-icons-outlined login-field-icon">lock</span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Parola"
            autocomplete="current-password"
          />
          <button type="button" class="login-field-toggle" @click="showPassword = !showPassword">
            <span class="material-icons-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="login-spinner"></span>
          <span v-else class="material-icons-outlined">login</span>
          {{ loading ? 'Se conectează...' : 'Autentificare' }}
        </button>
      </form>

      <div class="login-footer">
        <p>Parola implicită: <code>1234</code></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
}

.login-bg-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 25% 25%, rgba(13, 148, 136, 0.08) 0%, transparent 50%),
                     radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.06) 0%, transparent 50%);
  pointer-events: none;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(420px, 92vw);
  background: rgba(30, 41, 59, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03) inset;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.3);
}

.login-logo .material-icons-outlined {
  font-size: 32px;
  color: white;
}

.login-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px;
}

.login-header p {
  font-size: 0.84rem;
  color: #94a3b8;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #f87171;
  font-size: 0.84rem;
  animation: shake 0.4s ease-in-out;
}

.login-error .material-icons-outlined {
  font-size: 18px;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.login-field {
  position: relative;
  display: flex;
  align-items: center;
}

.login-field-icon {
  position: absolute;
  left: 14px;
  font-size: 20px;
  color: #64748b;
  pointer-events: none;
  transition: color 0.2s;
}

.login-field input {
  width: 100%;
  padding: 14px 44px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.2s;
}

.login-field input::placeholder {
  color: #64748b;
}

.login-field input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

.login-field input:focus ~ .login-field-icon,
.login-field input:focus + .login-field-icon {
  color: #14b8a6;
}

.login-field-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: color 0.2s;
}

.login-field-toggle:hover {
  color: #f1f5f9;
}

.login-field-toggle .material-icons-outlined {
  font-size: 20px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 6px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.35);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.login-btn .material-icons-outlined {
  font-size: 20px;
}

.login-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.login-footer p {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0;
}

.login-footer code {
  background: rgba(13, 148, 136, 0.15);
  color: #14b8a6;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
}
</style>
