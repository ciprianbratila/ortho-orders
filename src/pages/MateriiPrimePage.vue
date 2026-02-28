<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMateriiPrimeStore } from '../stores/materiiPrime'
import { useToastStore } from '../stores/toast'
import type { MateriePrima } from '../types'

const store = useMateriiPrimeStore()
const toast = useToastStore()

const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)

const form = ref({
  denumire: '',
  pret: 0,
  unitateMasura: 'buc',
  stoc: 0,
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return store.items
  const q = searchQuery.value.toLowerCase()
  return store.items.filter(item =>
    item.denumire.toLowerCase().includes(q)
  )
})

function openAdd() {
  editingId.value = null
  form.value = { denumire: '', pret: 0, unitateMasura: 'buc', stoc: 0 }
  showModal.value = true
}

function openEdit(item: MateriePrima) {
  editingId.value = item.id
  form.value = {
    denumire: item.denumire,
    pret: item.pret,
    unitateMasura: item.unitateMasura,
    stoc: item.stoc,
  }
  showModal.value = true
}

function save() {
  if (!form.value.denumire.trim()) {
    toast.error('Denumirea este obligatorie!')
    return
  }
  if (editingId.value) {
    store.update(editingId.value, { ...form.value })
    toast.success('Materie primă actualizată cu succes!')
  } else {
    store.add({ ...form.value })
    toast.success('Materie primă adăugată cu succes!')
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
    toast.success('Materie primă ștearsă!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

const unitOptions = [
  { value: 'buc', label: 'Bucăți' },
  { value: 'kg', label: 'Kilograme' },
  { value: 'm', label: 'Metri' },
  { value: 'l', label: 'Litri' },
  { value: 'mp', label: 'Metri pătrați' },
  { value: 'set', label: 'Set' },
]
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon teal">
          <span class="material-icons-outlined">inventory_2</span>
        </div>
        <div class="stat-info">
          <h3>{{ store.totalItems }}</h3>
          <p>Total Materii Prime</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">payments</span>
        </div>
        <div class="stat-info">
          <h3>{{ formatCurrency(store.valoareTotalaStoc) }}</h3>
          <p>Valoare Totală Stoc</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div class="search-box">
          <span class="material-icons-outlined">search</span>
          <input v-model="searchQuery" type="text" placeholder="Caută materie primă..." />
        </div>
        <button class="btn btn-primary" @click="openAdd">
          <span class="material-icons-outlined">add</span>
          Adaugă Materie Primă
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredItems.length > 0" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Denumire</th>
            <th>Preț Unitar</th>
            <th>Unitate Măsură</th>
            <th>Stoc</th>
            <th>Valoare Stoc</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td style="font-weight: 500;">{{ item.denumire }}</td>
            <td>{{ formatCurrency(item.pret) }}</td>
            <td>
              <span style="background: var(--bg-tertiary); padding: 3px 10px; border-radius: 6px; font-size: 0.8rem;">
                {{ item.unitateMasura }}
              </span>
            </td>
            <td>
              <span :style="{ color: item.stoc < 5 ? 'var(--error)' : 'var(--text-primary)', fontWeight: item.stoc < 5 ? '600' : '400' }">
                {{ item.stoc }}
              </span>
            </td>
            <td style="font-weight: 500;">{{ formatCurrency(item.pret * item.stoc) }}</td>
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
      <span class="material-icons-outlined">inventory_2</span>
      <h3>Nicio materie primă găsită</h3>
      <p>Adaugă prima materie primă pentru a începe configurarea produselor.</p>
      <button class="btn btn-primary" @click="openAdd">
        <span class="material-icons-outlined">add</span>
        Adaugă Materie Primă
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingId ? 'Editează Materie Primă' : 'Adaugă Materie Primă' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Denumire *</label>
            <input v-model="form.denumire" class="form-input" type="text" placeholder="ex: Piele naturală" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Preț Unitar (RON) *</label>
              <input v-model.number="form.pret" class="form-input" type="number" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">Unitate Măsură</label>
              <select v-model="form.unitateMasura" class="form-select">
                <option v-for="u in unitOptions" :key="u.value" :value="u.value">{{ u.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Stoc Inițial</label>
            <input v-model.number="form.stoc" class="form-input" type="number" min="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Anulează</button>
          <button class="btn btn-primary" @click="save">
            <span class="material-icons-outlined">{{ editingId ? 'save' : 'add' }}</span>
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
            <p>Această acțiune este ireversibilă. Sigur doriți să ștergeți această materie primă?</p>
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
