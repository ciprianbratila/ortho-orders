<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCNASStore } from '../stores/cnas'
import { useComenziStore } from '../stores/comenzi'
import { useClientiStore } from '../stores/clienti'
import { useProduseStore } from '../stores/produse'
import { useToastStore } from '../stores/toast'
import type { ProdusCNAS, ComandaCNAS, StatusComandaCNAS, Comanda, ProdusComanda } from '../types'

const cnasStore = useCNASStore()
const comenziStore = useComenziStore()
const clientiStore = useClientiStore()
const produseStore = useProduseStore()
const toast = useToastStore()

const activeTab = ref<'nomenclator' | 'comenzi' | 'setari'>('comenzi')

// ====== NOMENCLATOR ======
const showProdusModal = ref(false)
const editingProdusId = ref<string | null>(null)
const showDeleteProdusConfirm = ref(false)
const deleteProdusTargetId = ref<string | null>(null)
const produsSearch = ref('')

const produsForm = ref({ denumire: '', cod: '', descriere: '' })

const filteredProduse = computed(() => {
  if (!produsSearch.value) return cnasStore.produse
  const q = produsSearch.value.toLowerCase()
  return cnasStore.produse.filter(p =>
    p.denumire.toLowerCase().includes(q) || p.cod.toLowerCase().includes(q)
  )
})

function openAddProdus() {
  editingProdusId.value = null
  produsForm.value = { denumire: '', cod: '', descriere: '' }
  showProdusModal.value = true
}

function openEditProdus(p: ProdusCNAS) {
  editingProdusId.value = p.id
  produsForm.value = { denumire: p.denumire, cod: p.cod, descriere: p.descriere }
  showProdusModal.value = true
}

function saveProdus() {
  if (!produsForm.value.denumire.trim()) {
    toast.error('Denumirea este obligatorie!')
    return
  }
  if (editingProdusId.value) {
    cnasStore.updateProdus(editingProdusId.value, { ...produsForm.value })
    toast.success('Produs CNAS actualizat!')
  } else {
    cnasStore.addProdus({ ...produsForm.value })
    toast.success('Produs CNAS adăugat!')
  }
  showProdusModal.value = false
}

function confirmDeleteProdus(id: string) {
  deleteProdusTargetId.value = id
  showDeleteProdusConfirm.value = true
}

function executeDeleteProdus() {
  if (deleteProdusTargetId.value) {
    cnasStore.removeProdus(deleteProdusTargetId.value)
    toast.success('Produs CNAS șters!')
  }
  showDeleteProdusConfirm.value = false
  deleteProdusTargetId.value = null
}

// ====== SETARI ======
const setariForm = ref({ valoareDecontare: 0 })
const setariEditing = ref(false)

function openSetariEdit() {
  setariForm.value.valoareDecontare = cnasStore.valoareDecontare
  setariEditing.value = true
}

function saveSetari() {
  cnasStore.updateSetari(setariForm.value.valoareDecontare)
  setariEditing.value = false
  toast.success('Valoare decontare actualizată!')
}

// ====== COMENZI CNAS ======
const showComandaModal = ref(false)
const showDeleteComandaConfirm = ref(false)
const deleteComandaTargetId = ref<string | null>(null)
const showDetailModal = ref(false)
const selectedComanda = ref<ComandaCNAS | null>(null)
const comandaSearch = ref('')
const filterStatus = ref<string>('all')

const statusOptions: { value: StatusComandaCNAS; label: string }[] = [
  { value: 'noua', label: 'Nouă' },
  { value: 'trimisa', label: 'Trimisă' },
  { value: 'aprobata', label: 'Aprobată' },
  { value: 'respinsa', label: 'Respinsă' },
]

const statusLabels: Record<string, string> = {
  noua: 'Nouă',
  trimisa: 'Trimisă',
  aprobata: 'Aprobată',
  respinsa: 'Respinsă',
}

const statusColors: Record<string, { bg: string; color: string }> = {
  noua: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  trimisa: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
  aprobata: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
  respinsa: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
}

// Comanda CNAS form
const comandaForm = ref({
  comandaId: '',
  comandaProdusId: '',
  produseCNAS: [] as { produsCNASId: string; cantitate: number }[],
  observatii: '',
})

// Get orders that have products with CNAS decisions
const comenziCuCNAS = computed(() => {
  return comenziStore.items.filter(c =>
    c.status !== 'anulata' && c.produse.some(p => p.decizieCNAS)
  )
})

// Get products on selected order that have CNAS decisions
const produseComandaCuCNAS = computed(() => {
  if (!comandaForm.value.comandaId) return []
  const comanda = comenziStore.getById(comandaForm.value.comandaId)
  if (!comanda) return []
  return comanda.produse.filter(p => p.decizieCNAS)
})

// Check if a product on order already has a CNAS order
function hasExistingCNASOrder(comandaProdusId: string): boolean {
  return !!cnasStore.getComandaByProdusId(comandaProdusId)
}

const filteredComenzi = computed(() => {
  let items = cnasStore.comenzi
  if (filterStatus.value !== 'all') {
    items = items.filter(c => c.status === filterStatus.value)
  }
  if (comandaSearch.value) {
    const q = comandaSearch.value.toLowerCase()
    items = items.filter(c => {
      const comanda = comenziStore.getById(c.comandaId)
      const client = comanda ? clientiStore.getById(comanda.clientId) : null
      const clientName = client ? `${client.nume} ${client.prenume}`.toLowerCase() : ''
      return c.numarComandaCNAS.toLowerCase().includes(q) ||
        clientName.includes(q) ||
        comanda?.numarComanda.toLowerCase().includes(q)
    })
  }
  return items
})

function openAddComanda() {
  comandaForm.value = {
    comandaId: '',
    comandaProdusId: '',
    produseCNAS: [],
    observatii: '',
  }
  showComandaModal.value = true
}

function addProdusCNASToForm() {
  comandaForm.value.produseCNAS.push({ produsCNASId: '', cantitate: 1 })
}

function removeProdusCNASFromForm(idx: number) {
  comandaForm.value.produseCNAS.splice(idx, 1)
}

async function saveComanda() {
  if (!comandaForm.value.comandaId) {
    toast.error('Selectați o comandă client!')
    return
  }
  if (!comandaForm.value.comandaProdusId) {
    toast.error('Selectați un produs de pe comandă!')
    return
  }
  if (comandaForm.value.produseCNAS.length === 0) {
    toast.error('Adăugați cel puțin un produs CNAS!')
    return
  }
  if (comandaForm.value.produseCNAS.some(p => !p.produsCNASId)) {
    toast.error('Selectați toate produsele CNAS!')
    return
  }

  const result = await cnasStore.addComanda({
    comandaId: comandaForm.value.comandaId,
    comandaProdusId: comandaForm.value.comandaProdusId,
    produseCNAS: comandaForm.value.produseCNAS,
    observatii: comandaForm.value.observatii,
  })

  if (result) {
    toast.success(`Comandă CNAS ${result.numarComandaCNAS} creată!`)
    showComandaModal.value = false
  }
}

function changeComandaStatus(id: string, status: StatusComandaCNAS) {
  cnasStore.updateStatusComanda(id, status)
  toast.success(`Status CNAS actualizat: ${statusLabels[status]}`)
}

function confirmDeleteComanda(id: string) {
  deleteComandaTargetId.value = id
  showDeleteComandaConfirm.value = true
}

function executeDeleteComanda() {
  if (deleteComandaTargetId.value) {
    cnasStore.removeComanda(deleteComandaTargetId.value)
    toast.success('Comandă CNAS ștearsă!')
  }
  showDeleteComandaConfirm.value = false
  deleteComandaTargetId.value = null
}

function openDetail(c: ComandaCNAS) {
  selectedComanda.value = c
  showDetailModal.value = true
}

// ====== HELPERS ======
function getClientName(clientId: string): string {
  const client = clientiStore.getById(clientId)
  return client ? `${client.nume} ${client.prenume}` : 'Client necunoscut'
}

function getProdusName(id: string): string {
  const produs = produseStore.getById(id)
  return produs ? produs.denumire : 'Produs necunoscut'
}

function getProdusCNASName(id: string): string {
  const produs = cnasStore.getProdusCNASById(id)
  return produs ? produs.denumire : 'Produs CNAS necunoscut'
}

function getComandaInfo(comandaId: string): Comanda | undefined {
  return comenziStore.getById(comandaId)
}

function getProdusComandaById(comanda: Comanda, comandaProdusId: string): ProdusComanda | undefined {
  return comanda.produse.find(p => p.id === comandaProdusId)
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-outlined">health_and_safety</span>
        </div>
        <div class="stat-info">
          <h3>{{ cnasStore.totalComenzi }}</h3>
          <p>Comenzi CNAS</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">pending_actions</span>
        </div>
        <div class="stat-info">
          <h3>{{ cnasStore.comenziNoi.length }}</h3>
          <p>Noi</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">send</span>
        </div>
        <div class="stat-info">
          <h3>{{ cnasStore.comenziTrimise.length }}</h3>
          <p>Trimise</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">
          <span class="material-icons-outlined">check_circle</span>
        </div>
        <div class="stat-info">
          <h3>{{ cnasStore.comenziAprobate.length }}</h3>
          <p>Aprobate</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-outlined">inventory_2</span>
        </div>
        <div class="stat-info">
          <h3>{{ cnasStore.totalProduse }}</h3>
          <p>Produse Nomenclator</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="card" style="margin-bottom: 20px; padding: 0;">
      <div style="display: flex; border-bottom: 2px solid var(--border-color);">
        <button class="cnas-tab" :class="{ active: activeTab === 'comenzi' }" @click="activeTab = 'comenzi'">
          <span class="material-icons-outlined">local_shipping</span>
          Comenzi CNAS ({{ cnasStore.totalComenzi }})
        </button>
        <button class="cnas-tab" :class="{ active: activeTab === 'nomenclator' }" @click="activeTab = 'nomenclator'">
          <span class="material-icons-outlined">list_alt</span>
          Nomenclator ({{ cnasStore.totalProduse }})
        </button>
        <button class="cnas-tab" :class="{ active: activeTab === 'setari' }" @click="activeTab = 'setari'">
          <span class="material-icons-outlined">settings</span>
          Setări
        </button>
      </div>

      <!-- ============ COMENZI CNAS TAB ============ -->
      <div v-if="activeTab === 'comenzi'" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="search-box">
              <span class="material-icons-outlined">search</span>
              <input v-model="comandaSearch" type="text" placeholder="Caută comandă CNAS..." />
            </div>
            <select v-model="filterStatus" class="form-select" style="width: 160px;">
              <option value="all">Toate Statusurile</option>
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <button class="btn btn-primary" @click="openAddComanda">
            <span class="material-icons-outlined">add</span>
            Comandă CNAS Nouă
          </button>
        </div>

        <!-- Table -->
        <div v-if="filteredComenzi.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nr. Comandă CNAS</th>
                <th>Comandă Client</th>
                <th>Client</th>
                <th>Produs Comandă</th>
                <th>Produse CNAS</th>
                <th>Valoare Decontare</th>
                <th>Status</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredComenzi" :key="item.id">
                <td>
                  <span style="font-weight: 600; color: var(--text-accent); cursor: pointer;" @click="openDetail(item)">
                    {{ item.numarComandaCNAS }}
                  </span>
                </td>
                <td>
                  <span v-if="getComandaInfo(item.comandaId)" style="font-size: 0.84rem; color: var(--text-secondary);">
                    {{ getComandaInfo(item.comandaId)!.numarComanda }}
                  </span>
                </td>
                <td>
                  <span v-if="getComandaInfo(item.comandaId)">
                    {{ getClientName(getComandaInfo(item.comandaId)!.clientId) }}
                  </span>
                </td>
                <td>
                  <template v-if="getComandaInfo(item.comandaId)">
                    <span style="font-weight: 500;">
                      {{ getProdusName(getProdusComandaById(getComandaInfo(item.comandaId)!, item.comandaProdusId)?.produsId || '') }}
                    </span>
                  </template>
                </td>
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    <span
                      v-for="(p, idx) in item.produseCNAS"
                      :key="idx"
                      style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 500; background: rgba(16, 185, 129, 0.12); color: #34d399;"
                    >
                      {{ getProdusCNASName(p.produsCNASId) }}
                      <span v-if="p.cantitate > 1" style="opacity: 0.7;">x{{ p.cantitate }}</span>
                    </span>
                  </div>
                </td>
                <td style="font-weight: 600; color: #a78bfa;">
                  {{ formatCurrency(cnasStore.valoareDecontare) }}
                </td>
                <td>
                  <select
                    :value="item.status"
                    class="form-select"
                    style="width: 120px; padding: 5px 28px 5px 10px; font-size: 0.8rem; border-radius: 8px;"
                    @change="changeComandaStatus(item.id, ($event.target as HTMLSelectElement).value as StatusComandaCNAS)"
                  >
                    <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
                  </select>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" @click="openDetail(item)" title="Detalii">
                      <span class="material-icons-outlined">visibility</span>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDeleteComanda(item.id)" title="Șterge" style="color: var(--error);">
                      <span class="material-icons-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty -->
        <div v-else class="empty-state" style="padding: 40px 20px; text-align: center;">
          <span class="material-icons-outlined" style="font-size: 48px; color: var(--gray-600); display: block; margin-bottom: 12px;">health_and_safety</span>
          <h3 style="margin: 0 0 6px;">Nicio comandă CNAS</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Creați comenzi CNAS din comenzile client care au decizii CNAS atașate.</p>
        </div>
      </div>

      <!-- ============ NOMENCLATOR TAB ============ -->
      <div v-if="activeTab === 'nomenclator'" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div class="search-box">
            <span class="material-icons-outlined">search</span>
            <input v-model="produsSearch" type="text" placeholder="Caută produs CNAS..." />
          </div>
          <button class="btn btn-primary" @click="openAddProdus">
            <span class="material-icons-outlined">add</span>
            Adaugă Produs CNAS
          </button>
        </div>

        <div v-if="filteredProduse.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Denumire</th>
                <th>Cod</th>
                <th>Descriere</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in filteredProduse" :key="p.id">
                <td style="font-weight: 500;">{{ p.denumire }}</td>
                <td style="font-family: monospace; font-size: 0.84rem; color: var(--text-secondary);">{{ p.cod || '—' }}</td>
                <td style="color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ p.descriere || '—' }}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" @click="openEditProdus(p)" title="Editează">
                      <span class="material-icons-outlined">edit</span>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDeleteProdus(p.id)" title="Șterge" style="color: var(--error);">
                      <span class="material-icons-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state" style="padding: 40px 20px; text-align: center;">
          <span class="material-icons-outlined" style="font-size: 48px; color: var(--gray-600); display: block; margin-bottom: 12px;">list_alt</span>
          <h3 style="margin: 0 0 6px;">Nomenclator gol</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Adăugați produse acceptate de CNAS pentru decontare.</p>
        </div>
      </div>

      <!-- ============ SETARI TAB ============ -->
      <div v-if="activeTab === 'setari'" style="padding: 20px;">
        <div style="max-width: 500px;">
          <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined" style="font-size: 18px;">tune</span>
            Configurare Decontare CNAS
          </div>

          <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Valoare Decontare per Decizie</div>
            <div v-if="!setariEditing" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="font-size: 2rem; font-weight: 700; color: #a78bfa;">{{ formatCurrency(cnasStore.valoareDecontare) }}</div>
              <button class="btn btn-secondary" @click="openSetariEdit">
                <span class="material-icons-outlined">edit</span>
                Modifică
              </button>
            </div>
            <div v-else>
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label">Valoare Decontare (RON)</label>
                <input v-model.number="setariForm.valoareDecontare" class="form-input" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" @click="setariEditing = false">Anulează</button>
                <button class="btn btn-primary btn-sm" @click="saveSetari">
                  <span class="material-icons-outlined">save</span>
                  Salvează
                </button>
              </div>
            </div>

            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: flex-start; gap: 8px;">
                <span class="material-icons-outlined" style="font-size: 16px; margin-top: 2px; color: #60a5fa;">info</span>
                <span>Această valoare se aplică automat pentru fiecare decizie CNAS atașată unui produs pe comanda client. Dacă o comandă are mai multe produse cu decizie CNAS, fiecare produs va avea asociată această sumă de decontare.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Produs CNAS Modal ========== -->
    <div v-if="showProdusModal" class="modal-overlay" @click.self="showProdusModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingProdusId ? 'Editează Produs CNAS' : 'Adaugă Produs CNAS' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showProdusModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Denumire *</label>
            <input v-model="produsForm.denumire" class="form-input" type="text" placeholder="ex: Gheată standard" />
          </div>
          <div class="form-group">
            <label class="form-label">Cod</label>
            <input v-model="produsForm.cod" class="form-input" type="text" placeholder="ex: CNAS-001" />
          </div>
          <div class="form-group">
            <label class="form-label">Descriere</label>
            <textarea v-model="produsForm.descriere" class="form-textarea" placeholder="Descriere produs..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showProdusModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveProdus">
            <span class="material-icons-outlined">{{ editingProdusId ? 'save' : 'add' }}</span>
            {{ editingProdusId ? 'Salvează' : 'Adaugă' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== Comandă CNAS Modal ========== -->
    <div v-if="showComandaModal" class="modal-overlay" @click.self="showComandaModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined" style="color: var(--text-accent);">health_and_safety</span>
            Comandă CNAS Nouă
          </h3>
          <button class="btn btn-ghost btn-icon" @click="showComandaModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Selectare comandă client -->
          <div class="form-group">
            <label class="form-label">Comandă Client *</label>
            <select v-model="comandaForm.comandaId" class="form-select" @change="comandaForm.comandaProdusId = ''">
              <option value="" disabled>— Selectează comanda client —</option>
              <option v-for="c in comenziCuCNAS" :key="c.id" :value="c.id">
                {{ c.numarComanda }} — {{ getClientName(c.clientId) }} ({{ formatCurrency(c.totalCalculat) }})
              </option>
            </select>
            <div v-if="comenziCuCNAS.length === 0" style="margin-top: 6px; font-size: 0.82rem; color: var(--warning);">
              ⚠ Nu există comenzi cu decizii CNAS atașate. Adaugă mai întâi o decizie CNAS pe un produs din comandă.
            </div>
          </div>

          <!-- Selectare produs de pe comandă -->
          <div v-if="comandaForm.comandaId" class="form-group">
            <label class="form-label">Produs de pe Comandă *</label>
            <select v-model="comandaForm.comandaProdusId" class="form-select">
              <option value="" disabled>— Selectează produsul —</option>
              <option
                v-for="p in produseComandaCuCNAS"
                :key="p.id"
                :value="p.id"
                :disabled="hasExistingCNASOrder(p.id!)"
              >
                {{ getProdusName(p.produsId) }}
                (Decizie: {{ p.decizieCNAS?.numarDocument }})
                {{ hasExistingCNASOrder(p.id!) ? '— ✅ Are deja comandă CNAS' : '' }}
              </option>
            </select>
          </div>

          <!-- Mapare produse CNAS -->
          <div v-if="comandaForm.comandaProdusId" class="form-group">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <label class="form-label" style="margin-bottom: 0;">
                Produse CNAS Asociate *
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400; margin-left: 6px;">
                  (selectați din nomenclatorul CNAS)
                </span>
              </label>
              <button class="btn btn-secondary btn-sm" @click="addProdusCNASToForm">
                <span class="material-icons-outlined">add</span>
                Adaugă Produs CNAS
              </button>
            </div>

            <div v-if="comandaForm.produseCNAS.length === 0" style="padding: 20px; text-align: center; border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.85rem;">
              Adăugați produse din nomenclatorul CNAS
            </div>

            <div v-for="(pc, idx) in comandaForm.produseCNAS" :key="idx" style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding: 10px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <select v-model="pc.produsCNASId" class="form-select" style="flex: 3;">
                <option value="" disabled>— Produs CNAS —</option>
                <option v-for="p in cnasStore.produse" :key="p.id" :value="p.id">
                  {{ p.denumire }} {{ p.cod ? `(${p.cod})` : '' }}
                </option>
              </select>
              <input v-model.number="pc.cantitate" class="form-input" type="number" min="1" style="flex: 0 0 80px;" placeholder="Cant." />
              <button class="btn btn-ghost btn-icon" @click="removeProdusCNASFromForm(idx)" style="color: var(--error);">
                <span class="material-icons-outlined">remove_circle</span>
              </button>
            </div>
          </div>

          <!-- Info decontare -->
          <div v-if="comandaForm.comandaProdusId" style="background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: var(--radius-md); padding: 14px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="material-icons-outlined" style="font-size: 18px; color: #a78bfa;">account_balance</span>
              <span style="font-size: 0.82rem; font-weight: 600; color: #a78bfa;">Informații Decontare</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Valoare decontare per decizie: <strong style="color: #a78bfa;">{{ formatCurrency(cnasStore.valoareDecontare) }}</strong>
            </div>
          </div>

          <!-- Observatii -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">Observații</label>
            <textarea v-model="comandaForm.observatii" class="form-textarea" placeholder="Observații comandă CNAS..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showComandaModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveComanda">
            <span class="material-icons-outlined">health_and_safety</span>
            Creează Comandă CNAS
          </button>
        </div>
      </div>
    </div>

    <!-- ========== Detail Modal ========== -->
    <div v-if="showDetailModal && selectedComanda" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <h3>{{ selectedComanda.numarComandaCNAS }}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Detalii Comandă CNAS</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="showDetailModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Info Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Comandă Client</div>
              <div style="font-weight: 500; color: var(--text-accent);">{{ getComandaInfo(selectedComanda.comandaId)?.numarComanda || '—' }}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Client</div>
              <div style="font-weight: 500;">
                <template v-if="getComandaInfo(selectedComanda.comandaId)">
                  {{ getClientName(getComandaInfo(selectedComanda.comandaId)!.clientId) }}
                </template>
              </div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Produs Comandă</div>
              <div style="font-weight: 500;">
                <template v-if="getComandaInfo(selectedComanda.comandaId)">
                  {{ getProdusName(getProdusComandaById(getComandaInfo(selectedComanda.comandaId)!, selectedComanda.comandaProdusId)?.produsId || '') }}
                </template>
              </div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Status</div>
              <span
                style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 500;"
                :style="{ background: statusColors[selectedComanda.status]?.bg, color: statusColors[selectedComanda.status]?.color }"
              >
                {{ statusLabels[selectedComanda.status] }}
              </span>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Valoare Decontare</div>
              <div style="font-weight: 700; color: #a78bfa; font-size: 1.1rem;">{{ formatCurrency(cnasStore.valoareDecontare) }}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Data Creare</div>
              <div>{{ formatDate(selectedComanda.createdAt) }}</div>
            </div>
          </div>

          <!-- Produse CNAS asociate -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px;">Produse CNAS Asociate</div>
            <div v-for="(p, idx) in selectedComanda.produseCNAS" :key="idx" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(16, 185, 129, 0.12); flex-shrink: 0;">
                  <span class="material-icons-outlined" style="font-size: 16px; color: #10b981;">health_and_safety</span>
                </span>
                <span style="font-weight: 500;">{{ getProdusCNASName(p.produsCNASId) }}</span>
              </div>
              <span style="font-size: 0.84rem; color: var(--text-muted);">x{{ p.cantitate }}</span>
            </div>
          </div>

          <!-- Observatii -->
          <div v-if="selectedComanda.observatii" style="margin-bottom: 20px;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Observații</div>
            <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.88rem; color: var(--text-secondary);">
              {{ selectedComanda.observatii }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetailModal = false">Închide</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirms -->
    <div v-if="showDeleteProdusConfirm" class="modal-overlay" @click.self="showDeleteProdusConfirm = false">
      <div class="modal" style="width: min(400px, 90vw);">
        <div class="modal-body">
          <div class="confirm-dialog">
            <span class="material-icons-outlined">warning</span>
            <h4>Confirmă Ștergerea</h4>
            <p>Sigur doriți să ștergeți acest produs CNAS?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteProdusConfirm = false">Anulează</button>
          <button class="btn btn-danger" @click="executeDeleteProdus">
            <span class="material-icons-outlined">delete</span>
            Șterge
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteComandaConfirm" class="modal-overlay" @click.self="showDeleteComandaConfirm = false">
      <div class="modal" style="width: min(400px, 90vw);">
        <div class="modal-body">
          <div class="confirm-dialog">
            <span class="material-icons-outlined">warning</span>
            <h4>Confirmă Ștergerea</h4>
            <p>Sigur doriți să ștergeți această comandă CNAS?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteComandaConfirm = false">Anulează</button>
          <button class="btn btn-danger" @click="executeDeleteComanda">
            <span class="material-icons-outlined">delete</span>
            Șterge
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cnas-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.cnas-tab:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.cnas-tab.active {
  color: var(--text-accent);
  border-bottom-color: var(--text-accent);
}

.cnas-tab .material-icons-outlined {
  font-size: 20px;
}
</style>
