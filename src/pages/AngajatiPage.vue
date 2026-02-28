<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAngajatiStore } from '../stores/angajati'
import { useToastStore } from '../stores/toast'
import type { Angajat } from '../types'

const store = useAngajatiStore()
const toast = useToastStore()

const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)

const form = ref({
  nume: '',
  prenume: '',
  functie: 'Tehnician',
  telefon: '',
  email: '',
  activ: true,
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return store.items
  const q = searchQuery.value.toLowerCase()
  return store.items.filter(item =>
    item.nume.toLowerCase().includes(q) ||
    item.prenume.toLowerCase().includes(q) ||
    item.functie.toLowerCase().includes(q) ||
    item.telefon.includes(q)
  )
})

function openAdd() {
  editingId.value = null
  form.value = { nume: '', prenume: '', functie: 'Tehnician', telefon: '', email: '', activ: true }
  showModal.value = true
}

function openEdit(item: Angajat) {
  editingId.value = item.id
  form.value = {
    nume: item.nume,
    prenume: item.prenume,
    functie: item.functie,
    telefon: item.telefon,
    email: item.email,
    activ: item.activ,
  }
  showModal.value = true
}

function save() {
  if (!form.value.nume.trim() || !form.value.prenume.trim()) {
    toast.error('Numele și prenumele sunt obligatorii!')
    return
  }
  if (!form.value.functie.trim()) {
    toast.error('Funcția este obligatorie!')
    return
  }
  if (editingId.value) {
    store.update(editingId.value, { ...form.value })
    toast.success('Angajat actualizat cu succes!')
  } else {
    store.add({ ...form.value })
    toast.success('Angajat adăugat cu succes!')
  }
  showModal.value = false
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (deleteTargetId.value) {
    store.remove(deleteTargetId.value)
    toast.success('Angajat șters!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function toggleActiv(item: Angajat) {
  store.update(item.id, { activ: !item.activ })
  toast.success(item.activ ? 'Angajat dezactivat' : 'Angajat activat')
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">badge</span>
        </div>
        <div class="stat-info">
          <h3>{{ store.totalItems }}</h3>
          <p>Total Angajați</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-outlined">engineering</span>
        </div>
        <div class="stat-info">
          <h3>{{ store.angajatiActivi.length }}</h3>
          <p>Angajați Activi</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div class="search-box">
          <span class="material-icons-outlined">search</span>
          <input v-model="searchQuery" type="text" placeholder="Caută angajat (nume, funcție, telefon)..." />
        </div>
        <button class="btn btn-primary" @click="openAdd">
          <span class="material-icons-outlined">person_add</span>
          Adaugă Angajat
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredItems.length > 0" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Angajat</th>
            <th>Funcție</th>
            <th>Telefon</th>
            <th>Email</th>
            <th>Status</th>
            <th>Data Angajării</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id" :style="{ opacity: item.activ ? 1 : 0.5 }">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 600; color: white; flex-shrink: 0;"
                  :style="{ background: item.activ ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #6b7280, #374151)' }"
                >
                  {{ item.nume[0] }}{{ item.prenume[0] }}
                </div>
                <div>
                  <div style="font-weight: 500;">{{ item.nume }} {{ item.prenume }}</div>
                </div>
              </div>
            </td>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 500; background: rgba(59, 130, 246, 0.12); color: #60a5fa;">
                <span class="material-icons-outlined" style="font-size: 14px;">engineering</span>
                {{ item.functie }}
              </span>
            </td>
            <td>{{ item.telefon || '—' }}</td>
            <td>{{ item.email || '—' }}</td>
            <td>
              <span
                style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 500; cursor: pointer;"
                :style="{
                  background: item.activ ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: item.activ ? '#34d399' : '#f87171'
                }"
                @click="toggleActiv(item)"
                :title="item.activ ? 'Click pentru a dezactiva' : 'Click pentru a activa'"
              >
                <span class="material-icons-outlined" style="font-size: 14px;">{{ item.activ ? 'check_circle' : 'cancel' }}</span>
                {{ item.activ ? 'Activ' : 'Inactiv' }}
              </span>
            </td>
            <td style="color: var(--text-secondary);">{{ formatDate(item.createdAt) }}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openEdit(item)" title="Editează">
                  <span class="material-icons-outlined">edit</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDelete(item.id)" title="Șterge" style="color: var(--error);">
                  <span class="material-icons-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state card">
      <span class="material-icons-outlined">engineering</span>
      <h3>Niciun angajat înregistrat</h3>
      <p>Adaugă angajați (tehnicieni) pentru a-i putea asigna comenzilor.</p>
      <button class="btn btn-primary" @click="openAdd">
        <span class="material-icons-outlined">person_add</span>
        Adaugă Angajat
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingId ? 'Editează Angajat' : 'Adaugă Angajat' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nume *</label>
              <input v-model="form.nume" class="form-input" type="text" placeholder="Popescu" />
            </div>
            <div class="form-group">
              <label class="form-label">Prenume *</label>
              <input v-model="form.prenume" class="form-input" type="text" placeholder="Ion" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Funcție *</label>
            <select v-model="form.functie" class="form-select">
              <option value="Tehnician">Tehnician</option>
              <option value="Tehnician Senior">Tehnician Senior</option>
              <option value="Maistru">Maistru</option>
              <option value="Recepționer">Recepționer</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefon</label>
              <input v-model="form.telefon" class="form-input" type="tel" placeholder="0721 234 567" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="form.email" class="form-input" type="email" placeholder="email@exemplu.ro" />
            </div>
          </div>
          <div class="form-group" v-if="editingId">
            <label class="form-label" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" v-model="form.activ" style="width: 18px; height: 18px; accent-color: var(--primary-500);" />
              Angajat Activ
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Anulează</button>
          <button class="btn btn-primary" @click="save">
            <span class="material-icons-outlined">{{ editingId ? 'save' : 'person_add' }}</span>
            {{ editingId ? 'Salvează' : 'Adaugă' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal" style="width: min(400px, 90vw);">
        <div class="modal-body">
          <div class="confirm-dialog">
            <span class="material-icons-outlined">warning</span>
            <h4>Confirmă Ștergerea</h4>
            <p>Sigur doriți să ștergeți acest angajat?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">Anulează</button>
          <button class="btn btn-danger" @click="executeDelete">
            <span class="material-icons-outlined">delete</span>
            Șterge
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
