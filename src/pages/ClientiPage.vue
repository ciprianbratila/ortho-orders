<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import { useComenziStore } from '../stores/comenzi'
import { useProduseStore } from '../stores/produse'
import { useToastStore } from '../stores/toast'
import type { Client, Comanda, DocumentClient } from '../types'

const router = useRouter()

const store = useClientiStore()
const comenziStore = useComenziStore()
const produseStore = useProduseStore()
const toast = useToastStore()

const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const showFisaClient = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)
const selectedClient = ref<Client | null>(null)

const form = ref({
  nume: '',
  prenume: '',
  cnp: '',
  telefon: '',
  email: '',
  adresa: '',
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return store.items
  const q = searchQuery.value.toLowerCase()
  return store.items.filter(item =>
    item.nume.toLowerCase().includes(q) ||
    item.prenume.toLowerCase().includes(q) ||
    item.cnp.includes(q) ||
    item.telefon.includes(q)
  )
})

// ====== Fișă Client Helpers ======

function getClientOrders(clientId: string): Comanda[] {
  return comenziStore.items
    .filter(c => c.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function getClientStats(clientId: string) {
  const orders = getClientOrders(clientId)
  const activeOrders = orders.filter(c => c.status !== 'anulata')
  const totalComenzi = orders.length
  const comenziActiveCount = orders.filter(c => c.status !== 'anulata' && c.status !== 'livrata').length
  const valoareTotala = activeOrders.reduce((sum, c) => sum + c.totalCalculat, 0)
  const totalAchitat = activeOrders.reduce((sum, c) => sum + c.avans + (c.decizieCAS?.valoare || 0), 0)
  const restPlata = Math.max(0, valoareTotala - totalAchitat)
  return { totalComenzi, comenziActiveCount, valoareTotala, totalAchitat, restPlata }
}

function getProdusName(id: string): string {
  const produs = produseStore.getById(id)
  return produs ? produs.denumire : 'Produs necunoscut'
}

const statusLabels: Record<string, string> = {
  noua: 'Nouă',
  in_lucru: 'În Lucru',
  finalizata: 'Finalizată',
  livrata: 'Livrată',
  anulata: 'Anulată',
}

const metodaPlataLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  decizie_cas: 'Decizie CAS',
}

// ====== CRUD Functions ======

function openFisaClient(item: Client) {
  selectedClient.value = item
  showFisaClient.value = true
}

function openAdd() {
  editingId.value = null
  form.value = { nume: '', prenume: '', cnp: '', telefon: '', email: '', adresa: '' }
  showModal.value = true
}

function openEdit(item: Client) {
  editingId.value = item.id
  form.value = {
    nume: item.nume,
    prenume: item.prenume,
    cnp: item.cnp,
    telefon: item.telefon,
    email: item.email,
    adresa: item.adresa,
  }
  showModal.value = true
}

function openEditFromFisa() {
  if (selectedClient.value) {
    showFisaClient.value = false
    openEdit(selectedClient.value)
  }
}

function save() {
  if (!form.value.nume.trim() || !form.value.prenume.trim()) {
    toast.error('Numele și prenumele sunt obligatorii!')
    return
  }
  if (editingId.value) {
    store.update(editingId.value, { ...form.value })
    toast.success('Client actualizat cu succes!')
  } else {
    store.add({ ...form.value })
    toast.success('Client adăugat cu succes!')
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
    toast.success('Client șters!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

function getValoareCAS(comanda: Comanda): number {
  return comanda.decizieCAS?.valoare || 0
}

function getRestPlataComanda(comanda: Comanda): number {
  return Math.max(0, comanda.totalCalculat - comanda.avans - getValoareCAS(comanda))
}

// ============ Documente Client ============
const tipuriDocument = [
  { value: 'masuratori', label: 'Măsurători', icon: 'straighten', color: '#3b82f6' },
  { value: 'mulaj', label: 'Mulaj', icon: 'view_in_ar', color: '#8b5cf6' },
  { value: 'radiografie', label: 'Radiografie', icon: 'radiology', color: '#f59e0b' },
  { value: 'reteta', label: 'Rețetă', icon: 'receipt_long', color: '#10b981' },
  { value: 'altele', label: 'Altele', icon: 'attach_file', color: '#6b7280' },
]

const showDocForm = ref(false)
const docForm = ref({
  tip: 'masuratori',
  denumire: '',
  observatii: '',
  numeDocument: '' as string | undefined,
  fisierBase64: '' as string | undefined,
})

function getTipLabel(tip: string) {
  return tipuriDocument.find(t => t.value === tip) || tipuriDocument[4]
}

function addDocument() {
  if (!selectedClient.value) return
  if (!docForm.value.denumire.trim()) {
    toast.error('Denumirea documentului este obligatorie!')
    return
  }
  const doc: DocumentClient = {
    id: crypto.randomUUID(),
    tip: docForm.value.tip,
    denumire: docForm.value.denumire,
    observatii: docForm.value.observatii,
    numeDocument: docForm.value.numeDocument || undefined,
    fisierBase64: docForm.value.fisierBase64 || undefined,
    createdAt: new Date().toISOString(),
  }
  const docs = selectedClient.value.documente ? [...selectedClient.value.documente] : []
  docs.push(doc)
  store.update(selectedClient.value.id, { documente: docs })
  // refresh selectedClient
  selectedClient.value = store.getById(selectedClient.value.id) || null
  showDocForm.value = false
  docForm.value = { tip: 'masuratori', denumire: '', observatii: '', numeDocument: undefined, fisierBase64: undefined }
  toast.success('Document adăugat!')
}

function removeDocument(docId: string) {
  if (!selectedClient.value) return
  const docs = (selectedClient.value.documente || []).filter((d: DocumentClient) => d.id !== docId)
  store.update(selectedClient.value.id, { documente: docs })
  selectedClient.value = store.getById(selectedClient.value.id) || null
  toast.success('Document șters!')
}

function handleDocFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    docForm.value.numeDocument = file.name
    docForm.value.fisierBase64 = reader.result as string
  }
  reader.readAsDataURL(file)
}

function downloadDocFile(doc: DocumentClient) {
  if (!doc.fisierBase64 || !doc.numeDocument) return
  const link = document.createElement('a')
  link.href = doc.fisierBase64
  link.download = doc.numeDocument
  link.click()
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">people</span>
        </div>
        <div class="stat-info">
          <h3>{{ store.totalItems }}</h3>
          <p>Total Clienți</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div class="search-box">
          <span class="material-icons-outlined">search</span>
          <input v-model="searchQuery" type="text" placeholder="Caută client (nume, CNP, telefon)..." />
        </div>
        <button class="btn btn-primary" @click="openAdd">
          <span class="material-icons-outlined">person_add</span>
          Adaugă Client
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredItems.length > 0" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nume Complet</th>
            <th>CNP</th>
            <th>Telefon</th>
            <th>Email</th>
            <th>Adresă</th>
            <th>Data Înregistrării</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-600), var(--primary-800)); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 600; color: white; flex-shrink: 0;">
                  {{ item.nume[0] }}{{ item.prenume[0] }}
                </div>
                <div>
                  <div style="font-weight: 500; cursor: pointer; color: var(--text-accent);" @click="openFisaClient(item)">{{ item.nume }} {{ item.prenume }}</div>
                </div>
              </div>
            </td>
            <td style="font-family: monospace; font-size: 0.82rem; color: var(--text-secondary);">{{ item.cnp || '—' }}</td>
            <td>{{ item.telefon || '—' }}</td>
            <td>{{ item.email || '—' }}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.adresa || '—' }}</td>
            <td style="color: var(--text-secondary);">{{ formatDate(item.createdAt) }}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openFisaClient(item)" title="Fișă Client">
                  <span class="material-icons-outlined">badge</span>
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
      <span class="material-icons-outlined">people</span>
      <h3>Niciun client înregistrat</h3>
      <p>Adaugă clienți pentru a putea crea comenzi.</p>
      <button class="btn btn-primary" @click="openAdd">
        <span class="material-icons-outlined">person_add</span>
        Adaugă Client
      </button>
    </div>

    <!-- ==================== FIȘĂ CLIENT Modal ==================== -->
    <div v-if="showFisaClient && selectedClient" class="modal-overlay" @click.self="showFisaClient = false">
      <div class="modal modal-lg" style="width: min(860px, 92vw); max-height: 90vh;">
        <div class="modal-header" style="background: linear-gradient(135deg, rgba(0, 150, 136, 0.08), rgba(59, 130, 246, 0.08)); border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-500), var(--primary-800)); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; color: white; box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);">
              {{ selectedClient.nume[0] }}{{ selectedClient.prenume[0] }}
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.2rem;">{{ selectedClient.nume }} {{ selectedClient.prenume }}</h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Fișă Client — înregistrat {{ formatDate(selectedClient.createdAt) }}</span>
            </div>
          </div>
          <button class="btn btn-ghost btn-icon" @click="showFisaClient = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body" style="padding: 0; overflow-y: auto; max-height: calc(90vh - 140px);">

          <!-- Statistici Agregate -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 24px;">
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 14px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-accent);">{{ getClientStats(selectedClient.id).totalComenzi }}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Total Comenzi</div>
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 14px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: #60a5fa;">{{ getClientStats(selectedClient.id).comenziActiveCount }}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Comenzi Active</div>
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 14px; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--success);">{{ formatCurrency(getClientStats(selectedClient.id).valoareTotala) }}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Valoare Totală</div>
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 14px; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 700;" :style="{ color: getClientStats(selectedClient.id).restPlata > 0 ? 'var(--warning)' : 'var(--success)' }">{{ formatCurrency(getClientStats(selectedClient.id).restPlata) }}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Rest de Plată</div>
            </div>
          </div>

          <!-- Date Personale -->
          <div style="padding: 0 24px 20px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span class="material-icons-outlined" style="font-size: 16px;">person</span>
              Date Personale
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: 18px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nume</div>
                  <div style="font-weight: 500; margin-top: 3px;">{{ selectedClient.nume }}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Prenume</div>
                  <div style="font-weight: 500; margin-top: 3px;">{{ selectedClient.prenume }}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">CNP</div>
                  <div style="font-family: monospace; margin-top: 3px;">{{ selectedClient.cnp || '—' }}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Telefon</div>
                  <div style="margin-top: 3px;">
                    <a v-if="selectedClient.telefon" :href="'tel:' + selectedClient.telefon" style="color: var(--text-accent); text-decoration: none;">{{ selectedClient.telefon }}</a>
                    <span v-else>—</span>
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Email</div>
                  <div style="margin-top: 3px;">
                    <a v-if="selectedClient.email" :href="'mailto:' + selectedClient.email" style="color: var(--text-accent); text-decoration: none;">{{ selectedClient.email }}</a>
                    <span v-else>—</span>
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Data Înregistrării</div>
                  <div style="margin-top: 3px;">{{ formatDate(selectedClient.createdAt) }}</div>
                </div>
              </div>
              <div v-if="selectedClient.adresa" style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Adresă</div>
                <div style="margin-top: 3px;">{{ selectedClient.adresa }}</div>
              </div>
            </div>
          </div>

          <!-- ========== DOCUMENTE CLIENT ========== -->
          <div style="padding: 0 24px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                <span class="material-icons-outlined" style="font-size: 18px;">folder_open</span>
                Documente ({{ selectedClient?.documente?.length || 0 }})
              </div>
              <button class="btn btn-secondary btn-sm" @click="showDocForm = !showDocForm">
                <span class="material-icons-outlined">{{ showDocForm ? 'close' : 'note_add' }}</span>
                {{ showDocForm ? 'Anulează' : 'Adaugă Document' }}
              </button>
            </div>

            <!-- Add Document Form -->
            <div v-if="showDocForm" style="padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 14px; border: 1px solid var(--border-color);">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tip Document *</label>
                  <select v-model="docForm.tip" class="form-select">
                    <option v-for="t in tipuriDocument" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Denumire *</label>
                  <input v-model="docForm.denumire" class="form-input" type="text" placeholder="ex: Măsurători picior stâng" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Observații</label>
                <input v-model="docForm.observatii" class="form-input" type="text" placeholder="Detalii suplimentare..." />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <div>
                  <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
                    <span class="material-icons-outlined">upload_file</span>
                    {{ docForm.numeDocument || 'Atașează fișier' }}
                    <input type="file" style="display: none;" @change="handleDocFileUpload" />
                  </label>
                </div>
                <button class="btn btn-primary btn-sm" @click="addDocument">
                  <span class="material-icons-outlined">save</span>
                  Salvează Document
                </button>
              </div>
            </div>

            <!-- Document List -->
            <div v-if="selectedClient?.documente && selectedClient.documente.length > 0">
              <div v-for="doc in selectedClient.documente" :key="doc.id" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-bottom: 6px; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                  <span
                    class="material-icons-outlined"
                    style="font-size: 20px;"
                    :style="{ color: getTipLabel(doc.tip).color }"
                  >{{ getTipLabel(doc.tip).icon }}</span>
                  <div>
                    <div style="font-weight: 500; font-size: 0.88rem;">{{ doc.denumire }}</div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                      <span
                        style="font-size: 0.7rem; padding: 1px 8px; border-radius: 8px; font-weight: 500;"
                        :style="{ background: getTipLabel(doc.tip).color + '20', color: getTipLabel(doc.tip).color }"
                      >{{ getTipLabel(doc.tip).label }}</span>
                      <span v-if="doc.observatii" style="font-size: 0.75rem; color: var(--text-muted);">{{ doc.observatii }}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">{{ formatDate(doc.createdAt) }}</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <button v-if="doc.fisierBase64" class="btn btn-ghost btn-icon btn-sm" @click="downloadDocFile(doc)" title="Descarcă">
                    <span class="material-icons-outlined" style="font-size: 18px;">download</span>
                  </button>
                  <span v-if="doc.numeDocument" style="font-size: 0.72rem; color: var(--text-muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ doc.numeDocument }}</span>
                  <button class="btn btn-ghost btn-icon btn-sm" @click="removeDocument(doc.id)" title="Șterge" style="color: var(--error);">
                    <span class="material-icons-outlined" style="font-size: 18px;">delete</span>
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="!showDocForm" style="text-align: center; padding: 20px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span class="material-icons-outlined" style="font-size: 32px; color: var(--gray-600); display: block; margin-bottom: 6px;">folder_off</span>
              <div style="font-size: 0.84rem; color: var(--text-muted);">Niciun document atașat</div>
            </div>
          </div>

          <!-- Lista Comenzi -->
          <div style="padding: 0 24px 24px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="material-icons-outlined" style="font-size: 16px;">shopping_cart</span>
                Istoric Comenzi ({{ getClientOrders(selectedClient.id).length }})
              </span>
              <button class="btn btn-secondary btn-sm" @click="showFisaClient = false; router.push({ path: '/comenzi', query: { newOrder: '1', clientId: selectedClient!.id } })">
                <span class="material-icons-outlined">add</span>
                Comandă Nouă
              </button>
            </div>

            <div v-if="getClientOrders(selectedClient.id).length > 0">
              <div
                v-for="order in getClientOrders(selectedClient.id)"
                :key="order.id"
                style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px; margin-bottom: 10px; border: 1px solid var(--border-color); transition: border-color 0.2s ease;"
              >
                <!-- Order Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 600; color: var(--text-accent); font-size: 0.92rem;">{{ order.numarComanda }}</span>
                    <span
                      class="status-badge"
                      :class="order.status"
                    >
                      <span class="status-dot"></span>
                      {{ statusLabels[order.status] }}
                    </span>
                    <span
                      v-if="order.metodaPlata"
                      style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 500;"
                      :style="{
                        background: order.metodaPlata === 'decizie_cas' ? 'rgba(139, 92, 246, 0.12)' : order.metodaPlata === 'card' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: order.metodaPlata === 'decizie_cas' ? '#a78bfa' : order.metodaPlata === 'card' ? '#60a5fa' : '#34d399'
                      }"
                    >
                      {{ metodaPlataLabels[order.metodaPlata || 'cash'] }}
                    </span>
                  </div>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">{{ formatDate(order.dataComanda) }}</span>
                </div>

                <!-- Produse (compact list) -->
                <div style="margin-bottom: 10px;">
                  <div v-for="(pc, idx) in order.produse" :key="idx" style="display: flex; justify-content: space-between; font-size: 0.84rem; padding: 3px 0; color: var(--text-secondary);">
                    <span>{{ getProdusName(pc.produsId) }}</span>
                    <span style="color: var(--text-muted);">x{{ pc.cantitate }}</span>
                  </div>
                </div>

                <!-- Financial row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 0.84rem;">
                  <div style="display: flex; gap: 20px;">
                    <span>
                      <span style="color: var(--text-muted);">Total: </span>
                      <span style="font-weight: 600;">{{ formatCurrency(order.totalCalculat) }}</span>
                    </span>
                    <span v-if="order.avans > 0">
                      <span style="color: var(--text-muted);">Avans: </span>
                      <span style="color: var(--success); font-weight: 500;">{{ formatCurrency(order.avans) }}</span>
                    </span>
                    <span v-if="getValoareCAS(order) > 0">
                      <span style="color: var(--text-muted);">CAS: </span>
                      <span style="color: #a78bfa; font-weight: 500;">{{ formatCurrency(getValoareCAS(order)) }}</span>
                    </span>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Rest: </span>
                    <span style="font-weight: 700;" :style="{ color: getRestPlataComanda(order) > 0 ? 'var(--warning)' : 'var(--success)' }">
                      {{ formatCurrency(getRestPlataComanda(order)) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- No orders -->
            <div v-else style="text-align: center; padding: 30px 20px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span class="material-icons-outlined" style="font-size: 40px; color: var(--gray-600); display: block; margin-bottom: 8px;">inbox</span>
              <div style="font-size: 0.88rem; color: var(--text-secondary);">Nicio comandă pentru acest client</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Comenzile noi vor apărea automat aici</div>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showFisaClient = false">Închide</button>
          <button class="btn btn-primary" @click="openEditFromFisa">
            <span class="material-icons-outlined">edit</span>
            Editează Client
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingId ? 'Editează Client' : 'Adaugă Client' }}</h3>
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
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CNP</label>
              <input v-model="form.cnp" class="form-input" type="text" placeholder="1234567890123" maxlength="13" />
            </div>
            <div class="form-group">
              <label class="form-label">Telefon</label>
              <input v-model="form.telefon" class="form-input" type="tel" placeholder="0721 234 567" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="form.email" class="form-input" type="email" placeholder="email@exemplu.ro" />
          </div>
          <div class="form-group">
            <label class="form-label">Adresă</label>
            <textarea v-model="form.adresa" class="form-textarea" placeholder="Strada, nr., bloc, ap., oraș, județ..."></textarea>
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
            <p>Sigur doriți să ștergeți acest client? Comenzile asociate vor rămâne fără client.</p>
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
