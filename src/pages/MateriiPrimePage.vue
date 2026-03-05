<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMateriiPrimeStore } from '../stores/materiiPrime'
import { useIstoricStocStore } from '../stores/istoricStoc'
import { useToastStore } from '../stores/toast'
import type { MateriePrima, IstoricStoc } from '../types'

const store = useMateriiPrimeStore()
const istoricStore = useIstoricStocStore()
const toast = useToastStore()

const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)

// Stock management modals
const showAchizitieModal = ref(false)
const showCorectieModal = ref(false)
const showIstoricModal = ref(false)
const selectedMaterie = ref<MateriePrima | null>(null)
const istoricItems = ref<IstoricStoc[]>([])
const istoricLoading = ref(false)

const achizitieForm = ref({ cantitate: 0, pretAchizitie: 0, observatii: '' })
const corectieForm = ref({ cantitate: 0, tip: 'crestere' as 'crestere' | 'scadere', observatii: '' })

const form = ref({
  denumire: '',
  pret: 0,
  unitateMasura: '',
  stoc: 0,
  valoareStoc: 0,
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
  form.value = { denumire: '', pret: 0, unitateMasura: '', stoc: 0, valoareStoc: 0 }
  showModal.value = true
}

function openEdit(item: MateriePrima) {
  editingId.value = item.id
  form.value = {
    denumire: item.denumire,
    pret: item.pret,
    unitateMasura: item.unitateMasura,
    stoc: item.stoc,
    valoareStoc: item.valoareStoc,
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

// ============ Stock Management ============
function openAchizitie(item: MateriePrima) {
  selectedMaterie.value = item
  achizitieForm.value = { cantitate: 0, pretAchizitie: store.getPretMediu(item), observatii: '' }
  showAchizitieModal.value = true
}

async function saveAchizitie() {
  if (!selectedMaterie.value || achizitieForm.value.cantitate <= 0) {
    toast.error('Cantitatea trebuie să fie mai mare decât 0!')
    return
  }
  if (achizitieForm.value.pretAchizitie <= 0) {
    toast.error('Prețul de achiziție trebuie să fie mai mare decât 0!')
    return
  }
  await store.achizitie(selectedMaterie.value.id, achizitieForm.value.cantitate, achizitieForm.value.pretAchizitie, achizitieForm.value.observatii)
  toast.success(`Achiziție de ${achizitieForm.value.cantitate} ${selectedMaterie.value.unitateMasura} × ${formatCurrency(achizitieForm.value.pretAchizitie)} înregistrată!`)
  showAchizitieModal.value = false
}

function openCorectie(item: MateriePrima) {
  selectedMaterie.value = item
  corectieForm.value = { cantitate: 0, tip: 'crestere', observatii: '' }
  showCorectieModal.value = true
}

async function saveCorectie() {
  if (!selectedMaterie.value || corectieForm.value.cantitate === 0) {
    toast.error('Cantitatea trebuie completată!')
    return
  }
  const cantitate = corectieForm.value.tip === 'scadere' ? -Math.abs(corectieForm.value.cantitate) : Math.abs(corectieForm.value.cantitate)
  await store.corectieStoc(selectedMaterie.value.id, cantitate, corectieForm.value.observatii)
  toast.success('Corecție stoc înregistrată!')
  showCorectieModal.value = false
}

async function openIstoric(item: MateriePrima) {
  selectedMaterie.value = item
  istoricLoading.value = true
  showIstoricModal.value = true
  istoricItems.value = await istoricStore.fetchByMaterie(item.id)
  istoricLoading.value = false
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function tipMiscareLabel(tip: string): string {
  const labels: Record<string, string> = {
    achizitie: 'Achiziție',
    comanda: 'Comandă',
    corectie: 'Corecție manuală',
    anulare_comanda: 'Anulare comandă',
  }
  return labels[tip] || tip
}

function tipMiscareIcon(tip: string): string {
  const icons: Record<string, string> = {
    achizitie: 'add_shopping_cart',
    comanda: 'shopping_cart',
    corectie: 'tune',
    anulare_comanda: 'undo',
  }
  return icons[tip] || 'swap_vert'
}

function tipMiscareColor(tip: string): string {
  const colors: Record<string, string> = {
    achizitie: '#10b981',
    comanda: '#ef4444',
    corectie: '#f59e0b',
    anulare_comanda: '#3b82f6',
  }
  return colors[tip] || 'var(--text-secondary)'
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
            <th>Preț Mediu</th>
            <th>Unitate Măsură</th>
            <th>Stoc</th>
            <th>Valoare Stoc</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td style="font-weight: 500;">{{ item.denumire }}</td>
            <td>{{ formatCurrency(store.getPretMediu(item)) }}</td>
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
            <td style="font-weight: 500;">{{ formatCurrency(item.valoareStoc) }}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openAchizitie(item)" title="Achiziție" style="color: #10b981;">
                  <span class="material-icons-outlined">add_shopping_cart</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="openCorectie(item)" title="Corecție Stoc" style="color: #f59e0b;">
                  <span class="material-icons-outlined">tune</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="openIstoric(item)" title="Istoric Stoc" style="color: #3b82f6;">
                  <span class="material-icons-outlined">history</span>
                </button>
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
              <label class="form-label">Preț Inițial (RON) *</label>
              <input v-model.number="form.pret" class="form-input" type="number" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">Unitate Măsură</label>
              <select v-model="form.unitateMasura" class="form-select">
                <option value="" disabled>— Selectează unitate —</option>
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

    <!-- Achiziție Modal -->
    <div v-if="showAchizitieModal" class="modal-overlay" @click.self="showAchizitieModal = false">
      <div class="modal" style="width: min(480px, 90vw);">
        <div class="modal-header">
          <h3>
            <span class="material-icons-outlined" style="color: #10b981; vertical-align: middle; margin-right: 8px;">add_shopping_cart</span>
            Achiziție Stoc
          </h3>
          <button class="btn btn-ghost btn-icon" @click="showAchizitieModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: var(--bg-tertiary); padding: 14px 18px; border-radius: var(--radius-md); margin-bottom: 18px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Materie primă</div>
            <div style="font-weight: 600; font-size: 1rem;">{{ selectedMaterie?.denumire }}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Stoc curent: <strong>{{ selectedMaterie?.stoc }} {{ selectedMaterie?.unitateMasura }}</strong></div>
          </div>
          <div class="form-group">
            <label class="form-label">Cantitate achiziționată ({{ selectedMaterie?.unitateMasura }}) *</label>
            <input v-model.number="achizitieForm.cantitate" class="form-input" type="number" min="0.01" step="0.01" />
          </div>
          <div class="form-group">
            <label class="form-label">Preț achiziție unitar (RON) *</label>
            <input v-model.number="achizitieForm.pretAchizitie" class="form-input" type="number" min="0.01" step="0.01" />
          </div>
          <div v-if="achizitieForm.cantitate > 0 && achizitieForm.pretAchizitie > 0 && selectedMaterie" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 12px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px;">Previzualizare achiziție</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
              <span>Valoare achiziție:</span>
              <strong>{{ formatCurrency(achizitieForm.cantitate * achizitieForm.pretAchizitie) }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
              <span>Stoc nou:</span>
              <strong>{{ selectedMaterie.stoc + achizitieForm.cantitate }} {{ selectedMaterie.unitateMasura }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span>Preț mediu nou:</span>
              <strong>{{ formatCurrency((selectedMaterie.valoareStoc + achizitieForm.cantitate * achizitieForm.pretAchizitie) / (selectedMaterie.stoc + achizitieForm.cantitate)) }}</strong>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observații (opțional)</label>
            <input v-model="achizitieForm.observatii" class="form-input" type="text" placeholder="ex: Furnizor X, factură nr. 123" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAchizitieModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveAchizitie" style="background: linear-gradient(135deg, #10b981, #059669);">
            <span class="material-icons-outlined">add_shopping_cart</span>
            Înregistrează Achiziție
          </button>
        </div>
      </div>
    </div>

    <!-- Corecție Stoc Modal -->
    <div v-if="showCorectieModal" class="modal-overlay" @click.self="showCorectieModal = false">
      <div class="modal" style="width: min(480px, 90vw);">
        <div class="modal-header">
          <h3>
            <span class="material-icons-outlined" style="color: #f59e0b; vertical-align: middle; margin-right: 8px;">tune</span>
            Corecție Manuală Stoc
          </h3>
          <button class="btn btn-ghost btn-icon" @click="showCorectieModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: var(--bg-tertiary); padding: 14px 18px; border-radius: var(--radius-md); margin-bottom: 18px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Materie primă</div>
            <div style="font-weight: 600; font-size: 1rem;">{{ selectedMaterie?.denumire }}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Stoc curent: <strong>{{ selectedMaterie?.stoc }} {{ selectedMaterie?.unitateMasura }}</strong></div>
          </div>
          <div class="form-group">
            <label class="form-label">Tip corecție</label>
            <div style="display: flex; gap: 10px;">
              <button class="btn" :class="corectieForm.tip === 'crestere' ? 'btn-primary' : 'btn-secondary'" @click="corectieForm.tip = 'crestere'" style="flex: 1;">
                <span class="material-icons-outlined">arrow_upward</span>
                Creștere
              </button>
              <button class="btn" :class="corectieForm.tip === 'scadere' ? 'btn-primary' : 'btn-secondary'" @click="corectieForm.tip = 'scadere'" style="flex: 1;">
                <span class="material-icons-outlined">arrow_downward</span>
                Scădere
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Cantitate ({{ selectedMaterie?.unitateMasura }}) *</label>
            <input v-model.number="corectieForm.cantitate" class="form-input" type="number" min="0.01" step="0.01" />
          </div>
          <div class="form-group">
            <label class="form-label">Motiv corecție *</label>
            <input v-model="corectieForm.observatii" class="form-input" type="text" placeholder="ex: Pierderi la transport, inventar fizic" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCorectieModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveCorectie" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
            <span class="material-icons-outlined">tune</span>
            Aplică Corecție
          </button>
        </div>
      </div>
    </div>

    <!-- Istoric Stoc Modal -->
    <div v-if="showIstoricModal" class="modal-overlay" @click.self="showIstoricModal = false">
      <div class="modal" style="width: min(700px, 95vw);">
        <div class="modal-header">
          <h3>
            <span class="material-icons-outlined" style="color: #3b82f6; vertical-align: middle; margin-right: 8px;">history</span>
            Istoric Stoc — {{ selectedMaterie?.denumire }}
          </h3>
          <button class="btn btn-ghost btn-icon" @click="showIstoricModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="istoricLoading" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
            <span class="material-icons-outlined" style="font-size: 40px; animation: spin 1s linear infinite;">sync</span>
            <p style="margin-top: 12px;">Se încarcă istoricul...</p>
          </div>
          <div v-else-if="istoricItems.length === 0" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
            <span class="material-icons-outlined" style="font-size: 40px;">history_toggle_off</span>
            <p style="margin-top: 12px;">Nu există înregistrări în istoric.</p>
          </div>
          <div v-else style="max-height: 60vh; overflow-y: auto;">
            <div v-for="entry in istoricItems" :key="entry.id" style="display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border-color); align-items: flex-start;">
              <!-- Icon -->
              <div style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                :style="{ background: tipMiscareColor(entry.tipMiscare) + '18' }">
                <span class="material-icons-outlined" style="font-size: 18px;" :style="{ color: tipMiscareColor(entry.tipMiscare) }">
                  {{ tipMiscareIcon(entry.tipMiscare) }}
                </span>
              </div>
              <!-- Info -->
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                  <div>
                    <span style="font-weight: 600; font-size: 0.9rem;">{{ tipMiscareLabel(entry.tipMiscare) }}</span>
                    <span v-if="entry.numarComanda" style="margin-left: 8px; font-size: 0.78rem; padding: 2px 8px; border-radius: 6px; background: rgba(59, 130, 246, 0.12); color: #60a5fa;">
                      {{ entry.numarComanda }}
                    </span>
                  </div>
                  <span style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap;">{{ formatDate(entry.createdAt) }}</span>
                </div>
                <div style="margin-top: 6px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="color: var(--text-muted);">{{ entry.stocAnterior }}</span>
                  <span class="material-icons-outlined" style="font-size: 16px; color: var(--text-muted);">arrow_forward</span>
                  <span style="font-weight: 600;">{{ entry.stocNou }}</span>
                  <span style="padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600;"
                    :style="{
                      background: entry.cantitate >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: entry.cantitate >= 0 ? '#10b981' : '#ef4444'
                    }">
                    {{ entry.cantitate >= 0 ? '+' : '' }}{{ entry.cantitate }} {{ selectedMaterie?.unitateMasura }}
                  </span>
                </div>
                <div v-if="entry.observatii" style="margin-top: 4px; font-size: 0.82rem; color: var(--text-muted); font-style: italic;">
                  {{ entry.observatii }}
                </div>
                <div v-if="entry.pretAchizitie" style="margin-top: 4px; font-size: 0.8rem; color: var(--text-secondary);">
                  Preț achiziție: <strong>{{ formatCurrency(entry.pretAchizitie) }}</strong>/{{ selectedMaterie?.unitateMasura }}
                  · Valoare: <strong>{{ formatCurrency(entry.cantitate * entry.pretAchizitie) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showIstoricModal = false">Închide</button>
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
