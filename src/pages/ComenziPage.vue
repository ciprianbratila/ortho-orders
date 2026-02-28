<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComenziStore } from '../stores/comenzi'
import { useClientiStore } from '../stores/clienti'
import { useProduseStore } from '../stores/produse'
import { useAngajatiStore } from '../stores/angajati'
import { useFacturiStore } from '../stores/facturi'
import { useToastStore } from '../stores/toast'
import type { Comanda, ProdusComanda, StatusComanda, MetodaPlata, DecizieCAS, LinieFactura, DateClientFactura } from '../types'

const route = useRoute()
const router = useRouter()
const comenziStore = useComenziStore()
const clientiStore = useClientiStore()
const produseStore = useProduseStore()
const angajatiStore = useAngajatiStore()
const facturiStore = useFacturiStore()
const toast = useToastStore()

const searchQuery = ref('')
const filterStatus = ref<string>('all')
const filterThisWeek = ref(false)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const showDetailModal = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)
const selectedOrder = ref<Comanda | null>(null)

const form = ref({
  clientId: '',
  tehnicianId: '' as string,
  produse: [] as ProdusComanda[],
  status: 'noua' as StatusComanda,
  metodaPlata: 'cash' as MetodaPlata,
  dataComanda: new Date().toISOString().split('T')[0],
  dataLivrareEstimata: '',
  avans: 0,
  decizieCAS: null as DecizieCAS | null,
  observatii: '',
})

const statusOptions: { value: StatusComanda; label: string }[] = [
  { value: 'noua', label: 'Nouă' },
  { value: 'in_lucru', label: 'În Lucru' },
  { value: 'finalizata', label: 'Finalizată' },
  { value: 'livrata', label: 'Livrată' },
  { value: 'anulata', label: 'Anulată' },
]

const statusLabels: Record<string, string> = {
  noua: 'Nouă',
  in_lucru: 'În Lucru',
  finalizata: 'Finalizată',
  livrata: 'Livrată',
  anulata: 'Anulată',
}

const metodaPlataOptions: { value: MetodaPlata; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'payments' },
  { value: 'card', label: 'Card', icon: 'credit_card' },
  { value: 'decizie_cas', label: 'Decizie CAS', icon: 'description' },
]

const metodaPlataLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  decizie_cas: 'Decizie CAS',
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function isInThisWeek(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const { monday, sunday } = getWeekRange()
  return d >= monday && d <= sunday
}

const thisWeekCount = computed(() => {
  return comenziStore.items.filter(c =>
    c.status !== 'livrata' && c.status !== 'anulata' && isInThisWeek(c.dataLivrareEstimata)
  ).length
})

const filteredItems = computed(() => {
  let items = comenziStore.items
  if (filterStatus.value !== 'all') {
    items = items.filter(c => c.status === filterStatus.value)
  }
  if (filterThisWeek.value) {
    items = items.filter(c => isInThisWeek(c.dataLivrareEstimata))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(c => {
      const client = clientiStore.getById(c.clientId)
      const clientName = client ? `${client.nume} ${client.prenume}`.toLowerCase() : ''
      return c.numarComanda.toLowerCase().includes(q) || clientName.includes(q)
    })
  }
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function getClientName(id: string): string {
  const client = clientiStore.getById(id)
  return client ? `${client.nume} ${client.prenume}` : 'Client necunoscut'
}

function getProdusName(id: string): string {
  const produs = produseStore.getById(id)
  return produs ? produs.denumire : 'Produs necunoscut'
}

function getProdusTip(id: string): string {
  const produs = produseStore.getById(id)
  return produs?.tip || 'produs'
}

function getTehnicianName(id?: string): string {
  if (!id) return ''
  const ang = angajatiStore.getById(id)
  return ang ? `${ang.nume} ${ang.prenume}` : ''
}

function getValoareCAS(comanda: Comanda): number {
  return comanda.decizieCAS?.valoare || 0
}

function getRestPlata(comanda: Comanda): number {
  return Math.max(0, comanda.totalCalculat - comanda.avans - getValoareCAS(comanda))
}

function openAdd(preselectedClientId?: string) {
  editingId.value = null
  form.value = {
    clientId: preselectedClientId || (clientiStore.items.length > 0 ? clientiStore.items[0].id : ''),
    tehnicianId: '',
    produse: [],
    status: 'noua',
    metodaPlata: 'cash',
    dataComanda: new Date().toISOString().split('T')[0],
    dataLivrareEstimata: '',
    avans: 0,
    decizieCAS: null,
    observatii: '',
  }
  showModal.value = true
}

// Auto-open modal when navigated from client profile
onMounted(() => {
  if (route.query.newOrder === '1') {
    const clientId = route.query.clientId as string | undefined
    openAdd(clientId)
    // Clean query params from URL
    router.replace({ path: '/comenzi', query: {} })
  }
})

function openEdit(item: Comanda) {
  editingId.value = item.id
  form.value = {
    clientId: item.clientId,
    tehnicianId: item.tehnicianId || '',
    produse: [...item.produse.map(p => ({ ...p }))],
    status: item.status,
    metodaPlata: item.metodaPlata || 'cash',
    dataComanda: item.dataComanda.split('T')[0],
    dataLivrareEstimata: item.dataLivrareEstimata ? item.dataLivrareEstimata.split('T')[0] : '',
    avans: item.avans,
    decizieCAS: item.decizieCAS ? { ...item.decizieCAS } : null,
    observatii: item.observatii,
  }
  showModal.value = true
}

function openDetail(item: Comanda) {
  selectedOrder.value = item
  showDetailModal.value = true
}

function addProdus() {
  if (produseStore.items.length === 0) {
    toast.warning('Adaugă mai întâi produse sau servicii în catalog!')
    return
  }
  // Default to first product, fallback to first item
  const firstProdus = produseStore.produse[0] || produseStore.items[0]
  form.value.produse.push({
    produsId: firstProdus.id,
    cantitate: 1,
    observatii: '',
  })
}

function removeProdus(index: number) {
  form.value.produse.splice(index, 1)
}

function onMetodaPlataChange() {
  if (form.value.metodaPlata === 'decizie_cas' && !form.value.decizieCAS) {
    form.value.decizieCAS = {
      numarDocument: '',
      dataDocument: new Date().toISOString().split('T')[0],
      valoare: 0,
    }
  } else if (form.value.metodaPlata !== 'decizie_cas') {
    form.value.decizieCAS = null
  }
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]

  if (file.size > 10 * 1024 * 1024) {
    toast.error('Fișierul este prea mare! Maxim 10MB.')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (form.value.decizieCAS) {
      form.value.decizieCAS.numeDocument = file.name
      form.value.decizieCAS.fisierBase64 = reader.result as string
    }
  }
  reader.readAsDataURL(file)
  toast.success(`Fișier "${file.name}" atașat cu succes!`)
}

function removeFile() {
  if (form.value.decizieCAS) {
    form.value.decizieCAS.numeDocument = undefined
    form.value.decizieCAS.fisierBase64 = undefined
  }
}

function calcTotal(): number {
  return comenziStore.calculeazaTotal({ produse: form.value.produse })
}

function calcFormCASValue(): number {
  return form.value.decizieCAS?.valoare || 0
}

function calcFormRestPlata(): number {
  return Math.max(0, calcTotal() - form.value.avans - calcFormCASValue())
}

function save() {
  if (!form.value.clientId) {
    toast.error('Selectați un client!')
    return
  }
  if (form.value.produse.length === 0) {
    toast.error('Adăugați cel puțin un produs!')
    return
  }
  if (form.value.metodaPlata === 'decizie_cas') {
    if (!form.value.decizieCAS?.numarDocument) {
      toast.error('Introduceți numărul documentului Decizie CAS!')
      return
    }
    if (!form.value.decizieCAS?.valoare || form.value.decizieCAS.valoare <= 0) {
      toast.error('Introduceți valoarea din Decizia CAS!')
      return
    }
  }

  const total = calcTotal()
  if (form.value.avans > total) {
    toast.error(`Avansul (${formatCurrency(form.value.avans)}) nu poate depăși totalul comenzii (${formatCurrency(total)})!`)
    return
  }

  const payload: any = { ...form.value }
  if (form.value.metodaPlata !== 'decizie_cas') {
    payload.decizieCAS = undefined
  }
  // Convert empty tehnicianId to undefined
  if (!payload.tehnicianId) {
    payload.tehnicianId = undefined
  }

  if (editingId.value) {
    comenziStore.update(editingId.value, payload)
    toast.success('Comandă actualizată cu succes!')
  } else {
    comenziStore.add(payload)
    toast.success('Comandă creată cu succes!')
  }
  showModal.value = false
}

function changeStatus(id: string, status: StatusComanda) {
  comenziStore.updateStatus(id, status)
  toast.success(`Status actualizat: ${statusLabels[status]}`)
}

function changeTechnician(id: string, tehnicianId: string) {
  comenziStore.update(id, { tehnicianId: tehnicianId || undefined })
  const name = tehnicianId ? getTehnicianName(tehnicianId) : 'Neasignat'
  toast.success(`Tehnician actualizat: ${name}`)
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (deleteTargetId.value) {
    comenziStore.remove(deleteTargetId.value)
    toast.success('Comandă ștearsă!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function downloadFile(comanda: Comanda) {
  if (!comanda.decizieCAS?.fisierBase64 || !comanda.decizieCAS?.numeDocument) return
  const a = document.createElement('a')
  a.href = comanda.decizieCAS.fisierBase64
  a.download = comanda.decizieCAS.numeDocument
  a.click()
}

// ============ FACTURARE ============
const showInvoiceModal = ref(false)
const invoiceOrder = ref<Comanda | null>(null)
const invoiceClient = ref<DateClientFactura>({
  nume: '', prenume: '', cnp: '', telefon: '', email: '', adresa: ''
})
const invoiceLinii = ref<LinieFactura[]>([])
const invoiceTVA = ref(19)
const invoiceObservatii = ref('')
const invoiceDataScadenta = ref('')

function hasInvoice(comandaId: string): boolean {
  return !!facturiStore.getByComandaId(comandaId)
}

function openInvoiceModal(comanda: Comanda) {
  if (hasInvoice(comanda.id)) {
    toast.warning('Această comandă are deja o factură emisă!')
    return
  }
  invoiceOrder.value = comanda
  const client = clientiStore.getById(comanda.clientId)
  invoiceClient.value = {
    nume: client?.nume || '',
    prenume: client?.prenume || '',
    cnp: client?.cnp || '',
    telefon: client?.telefon || '',
    email: client?.email || '',
    adresa: client?.adresa || '',
  }
  invoiceLinii.value = comanda.produse.map(p => {
    const produs = produseStore.getById(p.produsId)
    const pretUnitar = produs ? produseStore.calculeazaPretProdus(produs) : 0
    return {
      denumire: produs?.denumire || 'Produs necunoscut',
      cantitate: p.cantitate,
      pretUnitar,
      total: pretUnitar * p.cantitate,
    }
  })
  invoiceTVA.value = 19
  invoiceObservatii.value = ''
  const scadenta = new Date()
  scadenta.setDate(scadenta.getDate() + 30)
  invoiceDataScadenta.value = scadenta.toISOString().split('T')[0]
  showInvoiceModal.value = true
}

function calcInvoiceSubtotal(): number {
  return invoiceLinii.value.reduce((sum, l) => sum + l.total, 0)
}

function calcInvoiceTVAAmount(): number {
  return calcInvoiceSubtotal() * invoiceTVA.value / 100
}

function calcInvoiceTotal(): number {
  return calcInvoiceSubtotal() + calcInvoiceTVAAmount()
}

function calcInvoiceRestPlata(): number {
  if (!invoiceOrder.value) return 0
  const avans = invoiceOrder.value.avans || 0
  const cas = invoiceOrder.value.decizieCAS?.valoare || 0
  return Math.max(0, calcInvoiceTotal() - avans - cas)
}

function saveInvoice() {
  if (!invoiceOrder.value) return
  if (invoiceLinii.value.length === 0) {
    toast.error('Factura trebuie să conțină cel puțin un produs!')
    return
  }
  const comanda = invoiceOrder.value
  const subtotal = calcInvoiceSubtotal()
  const totalTVA = calcInvoiceTVAAmount()
  const totalFactura = calcInvoiceTotal()
  const avans = comanda.avans || 0
  const decizieCASValoare = comanda.decizieCAS?.valoare || 0
  const restPlata = Math.max(0, totalFactura - avans - decizieCASValoare)

  facturiStore.add({
    numarFactura: facturiStore.generateNumarFactura(),
    comandaId: comanda.id,
    numarComanda: comanda.numarComanda,
    dateClient: { ...invoiceClient.value },
    linii: [...invoiceLinii.value],
    subtotal,
    tva: invoiceTVA.value,
    totalTVA,
    totalFactura,
    metodaPlata: comanda.metodaPlata,
    avans,
    decizieCASValoare,
    restPlata,
    dataEmitere: new Date().toISOString().split('T')[0],
    dataScadenta: invoiceDataScadenta.value,
    status: 'emisa',
    observatii: invoiceObservatii.value,
  })
  toast.success('Factură emisă cu succes!')
  showInvoiceModal.value = false
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon teal">
          <span class="material-icons-outlined">shopping_cart</span>
        </div>
        <div class="stat-info">
          <h3>{{ comenziStore.totalItems }}</h3>
          <p>Total Comenzi</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">pending_actions</span>
        </div>
        <div class="stat-info">
          <h3>{{ comenziStore.comenziActive.length }}</h3>
          <p>Comenzi Active</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-outlined">payments</span>
        </div>
        <div class="stat-info">
          <h3>{{ formatCurrency(comenziStore.venitTotal) }}</h3>
          <p>Venit Total</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">account_balance_wallet</span>
        </div>
        <div class="stat-info">
          <h3>{{ formatCurrency(comenziStore.avansTotal) }}</h3>
          <p>Avansuri Încasate</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-outlined">description</span>
        </div>
        <div class="stat-info">
          <h3>{{ formatCurrency(comenziStore.decizieCASTotal) }}</h3>
          <p>Total Decizii CAS</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="search-box">
            <span class="material-icons-outlined">search</span>
            <input v-model="searchQuery" type="text" placeholder="Caută comandă, client..." />
          </div>
          <select v-model="filterStatus" class="form-select" style="width: 180px;">
            <option value="all">Toate Statusurile</option>
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <button
            class="btn btn-sm"
            :class="filterThisWeek ? 'btn-primary' : 'btn-secondary'"
            @click="filterThisWeek = !filterThisWeek"
            style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.82rem; white-space: nowrap;"
          >
            <span class="material-icons-outlined" style="font-size: 16px;">date_range</span>
            Livrare săpt. curentă
            <span
              v-if="thisWeekCount > 0"
              style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; font-weight: 700; font-size: 0.72rem; padding: 1px 7px; border-radius: 10px; min-width: 20px; text-align: center;"
            >{{ thisWeekCount }}</span>
          </button>
        </div>
        <button class="btn btn-primary" @click="openAdd()">
          <span class="material-icons-outlined">add</span>
          Comandă Nouă
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredItems.length > 0" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nr. Comandă</th>
            <th>Client</th>
            <th>Tehnician</th>
            <th>Data</th>
            <th>Status</th>
            <th>Plată</th>
            <th>Total</th>
            <th>Avans</th>
            <th>CAS</th>
            <th>Rest Plată</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>
              <span style="font-weight: 600; color: var(--text-accent); cursor: pointer;" @click="openDetail(item)">
                {{ item.numarComanda }}
              </span>
            </td>
            <td>{{ getClientName(item.clientId) }}</td>
            <td>
              <select
                :value="item.tehnicianId || ''"
                class="form-select"
                style="width: 140px; padding: 5px 30px 5px 10px; font-size: 0.8rem; border-radius: 8px;"
                @change="changeTechnician(item.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">— Neasignat —</option>
                <option v-for="a in angajatiStore.angajatiActivi" :key="a.id" :value="a.id">{{ a.nume }} {{ a.prenume }}</option>
              </select>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.84rem;">{{ formatDate(item.dataComanda) }}</td>
            <td>
              <select
                :value="item.status"
                class="form-select"
                style="width: 130px; padding: 5px 30px 5px 10px; font-size: 0.8rem; border-radius: 8px;"
                @change="changeStatus(item.id, ($event.target as HTMLSelectElement).value as StatusComanda)"
              >
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </td>
            <td>
              <span
                style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 500;"
                :style="{
                  background: item.metodaPlata === 'decizie_cas' ? 'rgba(139, 92, 246, 0.15)' : item.metodaPlata === 'card' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: item.metodaPlata === 'decizie_cas' ? '#a78bfa' : item.metodaPlata === 'card' ? '#60a5fa' : '#34d399'
                }"
              >
                <span class="material-icons-outlined" style="font-size: 14px;">
                  {{ item.metodaPlata === 'decizie_cas' ? 'description' : item.metodaPlata === 'card' ? 'credit_card' : 'payments' }}
                </span>
                {{ metodaPlataLabels[item.metodaPlata || 'cash'] }}
              </span>
            </td>
            <td style="font-weight: 600;">{{ formatCurrency(item.totalCalculat) }}</td>
            <td style="color: var(--success);">{{ formatCurrency(item.avans) }}</td>
            <td>
              <span v-if="getValoareCAS(item) > 0" style="color: #a78bfa; font-weight: 500;">
                {{ formatCurrency(getValoareCAS(item)) }}
              </span>
              <span v-else style="color: var(--text-muted);">—</span>
            </td>
            <td style="font-weight: 500;" :style="{ color: getRestPlata(item) > 0 ? 'var(--warning)' : 'var(--success)' }">
              {{ formatCurrency(getRestPlata(item)) }}
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openDetail(item)" title="Detalii">
                  <span class="material-icons-outlined">visibility</span>
                </button>
                <button
                  class="btn btn-ghost btn-icon btn-sm"
                  @click="openInvoiceModal(item)"
                  :title="hasInvoice(item.id) ? 'Facturat' : 'Emite Factură'"
                  :style="{ color: hasInvoice(item.id) ? 'var(--success)' : 'var(--text-accent)' }"
                >
                  <span class="material-icons-outlined">{{ hasInvoice(item.id) ? 'task_alt' : 'receipt_long' }}</span>
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
      <span class="material-icons-outlined">shopping_cart</span>
      <h3>Nicio comandă găsită</h3>
      <p>Creează o comandă nouă selectând un client și produsele dorite.</p>
      <button class="btn btn-primary" @click="openAdd()">
        <span class="material-icons-outlined">add</span>
        Comandă Nouă
      </button>
    </div>

    <!-- ==================== Add/Edit Modal ==================== -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editingId ? 'Editează Comandă' : 'Comandă Nouă' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Client -->
          <div class="form-group">
            <label class="form-label">Client *</label>
            <select v-model="form.clientId" class="form-select">
              <option value="" disabled>Selectează client...</option>
              <option v-for="c in clientiStore.items" :key="c.id" :value="c.id">
                {{ c.nume }} {{ c.prenume }} — {{ c.cnp || c.telefon || 'fără detalii' }}
              </option>
            </select>
            <div v-if="clientiStore.items.length === 0" style="margin-top: 6px; font-size: 0.82rem; color: var(--warning);">
              ⚠ Nu ai clienți. <router-link to="/clienti" style="color: var(--text-accent);">Adaugă un client</router-link> mai întâi.
            </div>
          </div>

          <!-- Date -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Data Comandă</label>
              <input v-model="form.dataComanda" class="form-input" type="date" />
            </div>
            <div class="form-group">
              <label class="form-label">Data Livrare Estimată</label>
              <input v-model="form.dataLivrareEstimata" class="form-input" type="date" />
            </div>
          </div>

          <!-- Tehnician Responsabil -->
          <div class="form-group">
            <label class="form-label">Tehnician Responsabil</label>
            <select v-model="form.tehnicianId" class="form-select">
              <option value="">— Neasignat —</option>
              <option v-for="a in angajatiStore.angajatiActivi" :key="a.id" :value="a.id">
                {{ a.nume }} {{ a.prenume }} ({{ a.functie }})
              </option>
            </select>
            <div v-if="angajatiStore.angajatiActivi.length === 0" style="margin-top: 6px; font-size: 0.82rem; color: var(--text-muted);">
              Nu ai angajați activi. <router-link to="/angajati" style="color: var(--text-accent);">Adaugă angajați</router-link> pentru a asigna tehnicieni.
            </div>
          </div>

          <!-- Status (only for edit) -->
          <div v-if="editingId" class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select">
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>

          <!-- Produse & Servicii -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <label class="form-label" style="margin-bottom: 0;">Produse & Servicii *</label>
              <button class="btn btn-secondary btn-sm" @click="addProdus">
                <span class="material-icons-outlined">add</span>
                Adaugă pe Comandă
              </button>
            </div>
            <div v-if="form.produse.length === 0" style="padding: 20px; text-align: center; border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.85rem;">
              Niciun produs sau serviciu adăugat
            </div>
            <div v-for="(pc, idx) in form.produse" :key="idx" style="margin-bottom: 10px; padding: 12px; border-radius: var(--radius-md);"
              :style="{
                background: getProdusTip(pc.produsId) === 'serviciu' ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-tertiary)',
                border: getProdusTip(pc.produsId) === 'serviciu' ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid transparent'
              }"
            >
              <div style="display: flex; gap: 12px; align-items: center;">
                <!-- Tip indicator -->
                <span v-if="getProdusTip(pc.produsId) === 'serviciu'" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); flex-shrink: 0;" title="Serviciu">
                  <span class="material-icons-outlined" style="font-size: 16px; color: #f59e0b;">build</span>
                </span>
                <span v-else style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(59, 130, 246, 0.12); flex-shrink: 0;" title="Produs">
                  <span class="material-icons-outlined" style="font-size: 16px; color: #3b82f6;">category</span>
                </span>
                <select v-model="pc.produsId" class="form-select" style="flex: 2;">
                  <optgroup v-if="produseStore.produse.length > 0" label="📦 PRODUSE">
                    <option v-for="p in produseStore.produse" :key="p.id" :value="p.id">
                      {{ p.denumire }} ({{ formatCurrency(produseStore.calculeazaPretProdus(p)) }})
                    </option>
                  </optgroup>
                  <optgroup v-if="produseStore.servicii.length > 0" label="🔧 SERVICII">
                    <option v-for="p in produseStore.servicii" :key="p.id" :value="p.id">
                      {{ p.denumire }} ({{ formatCurrency(produseStore.calculeazaPretProdus(p)) }})
                    </option>
                  </optgroup>
                </select>
                <input v-model.number="pc.cantitate" class="form-input" type="number" min="1" style="flex: 0 0 80px;" placeholder="Cant." />
                <button class="btn btn-ghost btn-icon" @click="removeProdus(idx)" style="color: var(--error);">
                  <span class="material-icons-outlined">remove_circle</span>
                </button>
              </div>
              <input v-model="pc.observatii" class="form-input" type="text" :placeholder="getProdusTip(pc.produsId) === 'serviciu' ? 'Detalii serviciu (opțional)...' : 'Observații produs (opțional)...'" style="margin-top: 8px;" />
            </div>
          </div>

          <!-- ========== MODALITATE PLATĂ ========== -->
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 18px; background: rgba(30, 41, 59, 0.5);">
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
              <span class="material-icons-outlined" style="font-size: 18px;">account_balance_wallet</span>
              Modalitate de Plată
            </div>

            <!-- Payment Method Selection -->
            <div class="form-group">
              <label class="form-label">Metodă Plată</label>
              <div style="display: flex; gap: 10px;">
                <button
                  v-for="mp in metodaPlataOptions"
                  :key="mp.value"
                  class="btn"
                  :class="form.metodaPlata === mp.value ? 'btn-primary' : 'btn-secondary'"
                  style="flex: 1; padding: 12px;"
                  @click="form.metodaPlata = mp.value; onMetodaPlataChange()"
                >
                  <span class="material-icons-outlined" style="font-size: 20px;">{{ mp.icon }}</span>
                  {{ mp.label }}
                </button>
              </div>
            </div>

            <!-- Avans -->
            <div class="form-group">
              <label class="form-label">Avans (RON)</label>
              <input v-model.number="form.avans" class="form-input" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>

            <!-- Decizie CAS Section -->
            <div v-if="form.metodaPlata === 'decizie_cas' && form.decizieCAS" style="border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); padding: 16px; background: rgba(139, 92, 246, 0.06);">
              <div style="font-size: 0.78rem; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-outlined" style="font-size: 16px;">description</span>
                Decizie CAS
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nr. Document Decizie *</label>
                  <input v-model="form.decizieCAS.numarDocument" class="form-input" type="text" placeholder="ex: CAS-2026-001234" />
                </div>
                <div class="form-group">
                  <label class="form-label">Data Document</label>
                  <input v-model="form.decizieCAS.dataDocument" class="form-input" type="date" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Valoare Acoperită de CAS (RON) *</label>
                <input v-model.number="form.decizieCAS.valoare" class="form-input" type="number" min="0" step="0.01" placeholder="Suma din decizia CAS..." />
                <div v-if="form.decizieCAS.valoare > calcTotal()" style="margin-top: 6px; font-size: 0.78rem; color: var(--warning);">
                  ⚠ Valoarea CAS depășește totalul comenzii
                </div>
              </div>

              <!-- File Upload -->
              <div class="form-group">
                <label class="form-label">Atașează Document Decizie</label>
                <div v-if="!form.decizieCAS.numeDocument" style="border: 2px dashed rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease;" @click="($refs.fileInput as HTMLInputElement)?.click()">
                  <span class="material-icons-outlined" style="font-size: 32px; color: #a78bfa; display: block; margin-bottom: 6px;">cloud_upload</span>
                  <div style="font-size: 0.85rem; color: var(--text-secondary);">Click pentru a încărca document</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">PDF, JPG, PNG — max 10MB</div>
                </div>
                <div v-else style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                  <span class="material-icons-outlined" style="font-size: 24px; color: #a78bfa;">attach_file</span>
                  <div style="flex: 1;">
                    <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">{{ form.decizieCAS.numeDocument }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Document atașat</div>
                  </div>
                  <button class="btn btn-ghost btn-icon btn-sm" @click="removeFile" title="Șterge fișier" style="color: var(--error);">
                    <span class="material-icons-outlined">delete</span>
                  </button>
                </div>
                <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display: none;" @change="handleFileUpload" />
              </div>
            </div>
          </div>

          <!-- Observatii -->
          <div class="form-group">
            <label class="form-label">Observații Generale</label>
            <textarea v-model="form.observatii" class="form-textarea" placeholder="Observații despre comandă..."></textarea>
          </div>

          <!-- ========== CALCUL FINANCIAR (Preview) ========== -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; margin-top: 12px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">
              Sumar Financiar
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: var(--text-secondary);">Total Comandă</span>
              <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">{{ formatCurrency(calcTotal()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 12px;">
              <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-outlined" style="font-size: 16px; color: var(--success);">payments</span>
                Avans achitat
              </span>
              <span style="color: var(--success); font-weight: 500;">- {{ formatCurrency(form.avans) }}</span>
            </div>
            <div v-if="form.metodaPlata === 'decizie_cas' && form.decizieCAS" style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 12px;">
              <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-outlined" style="font-size: 16px; color: #a78bfa;">description</span>
                Decizie CAS
                <span v-if="form.decizieCAS.numarDocument" style="font-size: 0.72rem; color: var(--text-muted);">({{ form.decizieCAS.numarDocument }})</span>
              </span>
              <span style="color: #a78bfa; font-weight: 500;">- {{ formatCurrency(calcFormCASValue()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid var(--border-color);">
              <span style="font-weight: 700; font-size: 0.95rem;">Rest de Plată</span>
              <span style="font-weight: 800; font-size: 1.2rem;" :style="{ color: calcFormRestPlata() > 0 ? 'var(--warning)' : 'var(--success)' }">
                {{ formatCurrency(calcFormRestPlata()) }}
              </span>
            </div>
            <div v-if="calcFormRestPlata() === 0" style="margin-top: 8px; text-align: center; font-size: 0.8rem; color: var(--success); display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px;">check_circle</span>
              Comanda este achitată integral
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Anulează</button>
          <button class="btn btn-primary" @click="save">
            <span class="material-icons-outlined">{{ editingId ? 'save' : 'add' }}</span>
            {{ editingId ? 'Salvează' : 'Creează Comandă' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== Detail Modal ==================== -->
    <div v-if="showDetailModal && selectedOrder" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <h3>{{ selectedOrder.numarComanda }}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Detalii Comandă</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="showDetailModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Client</div>
              <div style="font-weight: 500;">{{ getClientName(selectedOrder.clientId) }}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Status</div>
              <span class="status-badge" :class="selectedOrder.status">
                <span class="status-dot"></span>
                {{ statusLabels[selectedOrder.status] }}
              </span>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Data Comandă</div>
              <div>{{ formatDate(selectedOrder.dataComanda) }}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Livrare Estimată</div>
              <div>{{ formatDate(selectedOrder.dataLivrareEstimata) }}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Metodă Plată</div>
              <span
                style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 8px; font-size: 0.84rem; font-weight: 500;"
                :style="{
                  background: (selectedOrder.metodaPlata || 'cash') === 'decizie_cas' ? 'rgba(139, 92, 246, 0.15)' : (selectedOrder.metodaPlata || 'cash') === 'card' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: (selectedOrder.metodaPlata || 'cash') === 'decizie_cas' ? '#a78bfa' : (selectedOrder.metodaPlata || 'cash') === 'card' ? '#60a5fa' : '#34d399'
                }"
              >
                <span class="material-icons-outlined" style="font-size: 18px;">
                  {{ (selectedOrder.metodaPlata || 'cash') === 'decizie_cas' ? 'description' : (selectedOrder.metodaPlata || 'cash') === 'card' ? 'credit_card' : 'payments' }}
                </span>
                {{ metodaPlataLabels[selectedOrder.metodaPlata || 'cash'] }}
              </span>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Tehnician Responsabil</div>
              <div style="font-weight: 500;" :style="{ color: selectedOrder.tehnicianId ? 'var(--text-primary)' : 'var(--text-muted)' }">
                {{ selectedOrder.tehnicianId ? getTehnicianName(selectedOrder.tehnicianId) : 'Neasignat' }}
              </div>
            </div>
          </div>

          <!-- Produse -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px;">Produse</div>
            <div v-for="(pc, idx) in selectedOrder.produse" :key="idx" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 6px;">
              <div>
                <div style="font-weight: 500;">{{ getProdusName(pc.produsId) }}</div>
                <div v-if="pc.observatii" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">{{ pc.observatii }}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.82rem; color: var(--text-muted);">x{{ pc.cantitate }}</div>
              </div>
            </div>
          </div>

          <!-- Decizie CAS Section in Detail -->
          <div v-if="selectedOrder.decizieCAS" style="margin-bottom: 20px;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #a78bfa; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px;">description</span>
              Decizie CAS
            </div>
            <div style="border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); padding: 14px; background: rgba(139, 92, 246, 0.06);">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nr. Document</div>
                  <div style="font-weight: 500; color: #a78bfa; margin-top: 2px;">{{ selectedOrder.decizieCAS.numarDocument }}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Data Document</div>
                  <div style="margin-top: 2px;">{{ formatDate(selectedOrder.decizieCAS.dataDocument) }}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Valoare CAS</div>
                  <div style="font-weight: 700; color: #a78bfa; font-size: 1.05rem; margin-top: 2px;">{{ formatCurrency(selectedOrder.decizieCAS.valoare) }}</div>
                </div>
              </div>
              <div v-if="selectedOrder.decizieCAS.numeDocument" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(139, 92, 246, 0.2);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="material-icons-outlined" style="font-size: 20px; color: #a78bfa;">attach_file</span>
                  <span style="font-size: 0.85rem; flex: 1;">{{ selectedOrder.decizieCAS.numeDocument }}</span>
                  <button class="btn btn-secondary btn-sm" @click="downloadFile(selectedOrder)" v-if="selectedOrder.decizieCAS.fisierBase64">
                    <span class="material-icons-outlined">download</span>
                    Descarcă
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Observatii -->
          <div v-if="selectedOrder.observatii" style="margin-bottom: 20px;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Observații</div>
            <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.88rem; color: var(--text-secondary);">
              {{ selectedOrder.observatii }}
            </div>
          </div>

          <!-- Calcul Financiar Detaliat -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">
              Calcul Financiar
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--text-secondary);">Total Comandă</span>
              <span style="font-weight: 600;">{{ formatCurrency(selectedOrder.totalCalculat) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 12px;">
              <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-outlined" style="font-size: 16px; color: var(--success);">payments</span>
                Avans achitat
              </span>
              <span style="color: var(--success);">- {{ formatCurrency(selectedOrder.avans) }}</span>
            </div>
            <div v-if="selectedOrder.decizieCAS" style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 12px;">
              <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-outlined" style="font-size: 16px; color: #a78bfa;">description</span>
                Decizie CAS
                <span style="font-size: 0.72rem; color: var(--text-muted);">({{ selectedOrder.decizieCAS.numarDocument }})</span>
              </span>
              <span style="color: #a78bfa; font-weight: 500;">- {{ formatCurrency(selectedOrder.decizieCAS.valoare) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid var(--border-color);">
              <span style="font-weight: 700;">Rest de Plată</span>
              <span style="font-weight: 800; font-size: 1.2rem;" :style="{ color: getRestPlata(selectedOrder) > 0 ? 'var(--warning)' : 'var(--success)' }">
                {{ formatCurrency(getRestPlata(selectedOrder)) }}
              </span>
            </div>
            <div v-if="getRestPlata(selectedOrder) === 0" style="margin-top: 8px; text-align: center; font-size: 0.8rem; color: var(--success); display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px;">check_circle</span>
              Comanda este achitată integral
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetailModal = false">Închide</button>
          <button class="btn btn-primary" @click="showDetailModal = false; openEdit(selectedOrder!)">
            <span class="material-icons-outlined">edit</span>
            Editează
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
            <p>Sigur doriți să ștergeți această comandă? Acțiunea este ireversibilă.</p>
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

    <!-- ==================== Invoice Creation Modal ==================== -->
    <div v-if="showInvoiceModal && invoiceOrder" class="modal-overlay" @click.self="showInvoiceModal = false">
      <div class="modal modal-lg" style="max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined" style="color: var(--text-accent);">receipt_long</span>
            Emite Factură — {{ invoiceOrder.numarComanda }}
          </h3>
          <button class="btn btn-ghost btn-icon" @click="showInvoiceModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Date Client (editable) -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px;">person</span>
              Date Client (editabile)
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px;">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nume</label>
                  <input v-model="invoiceClient.nume" class="form-input" type="text" />
                </div>
                <div class="form-group">
                  <label class="form-label">Prenume</label>
                  <input v-model="invoiceClient.prenume" class="form-input" type="text" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">CNP</label>
                  <input v-model="invoiceClient.cnp" class="form-input" type="text" />
                </div>
                <div class="form-group">
                  <label class="form-label">Telefon</label>
                  <input v-model="invoiceClient.telefon" class="form-input" type="text" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input v-model="invoiceClient.email" class="form-input" type="text" />
                </div>
                <div class="form-group">
                  <label class="form-label">Adresă</label>
                  <input v-model="invoiceClient.adresa" class="form-input" type="text" />
                </div>
              </div>
            </div>
          </div>

          <!-- Linii Factură -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px;">list_alt</span>
              Linii Factură
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 6px 10px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Denumire</th>
                    <th style="text-align: center; padding: 6px 10px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; width: 70px;">Cant.</th>
                    <th style="text-align: right; padding: 6px 10px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; width: 120px;">Preț Unitar</th>
                    <th style="text-align: right; padding: 6px 10px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; width: 120px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(linie, idx) in invoiceLinii" :key="idx" style="border-top: 1px solid var(--border-color);">
                    <td style="padding: 8px 10px; font-size: 0.88rem;">{{ linie.denumire }}</td>
                    <td style="padding: 8px 10px; text-align: center; font-size: 0.88rem;">{{ linie.cantitate }}</td>
                    <td style="padding: 8px 10px; text-align: right; font-size: 0.88rem;">{{ formatCurrency(linie.pretUnitar) }}</td>
                    <td style="padding: 8px 10px; text-align: right; font-weight: 600; font-size: 0.88rem;">{{ formatCurrency(linie.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TVA & Scadenta -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">TVA (%)</label>
              <input v-model.number="invoiceTVA" class="form-input" type="number" min="0" max="100" step="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Data Scadență</label>
              <input v-model="invoiceDataScadenta" class="form-input" type="date" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observații Factură</label>
            <textarea v-model="invoiceObservatii" class="form-textarea" placeholder="Observații opționale..."></textarea>
          </div>

          <!-- Preview Totals -->
          <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.88rem;">
              <span style="color: var(--text-secondary);">Subtotal</span>
              <span>{{ formatCurrency(calcInvoiceSubtotal()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.88rem;">
              <span style="color: var(--text-secondary);">TVA ({{ invoiceTVA }}%)</span>
              <span>{{ formatCurrency(calcInvoiceTVAAmount()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 1.1rem; font-weight: 700; border-top: 2px solid var(--border-color); margin-top: 4px;">
              <span>Total Factură</span>
              <span style="color: var(--text-accent);">{{ formatCurrency(calcInvoiceTotal()) }}</span>
            </div>
            <div v-if="invoiceOrder.avans > 0" style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.82rem; color: var(--text-muted);">
              <span>Avans achitat</span>
              <span style="color: var(--success);">- {{ formatCurrency(invoiceOrder.avans) }}</span>
            </div>
            <div v-if="getValoareCAS(invoiceOrder) > 0" style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.82rem; color: var(--text-muted);">
              <span>Decizie CAS</span>
              <span style="color: #a78bfa;">- {{ formatCurrency(getValoareCAS(invoiceOrder)) }}</span>
            </div>
            <div v-if="invoiceOrder.avans > 0 || getValoareCAS(invoiceOrder) > 0" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.95rem; font-weight: 600; border-top: 1px solid var(--border-color); margin-top: 4px;">
              <span>Rest de plată</span>
              <span :style="{ color: calcInvoiceRestPlata() > 0 ? 'var(--warning)' : 'var(--success)' }">{{ formatCurrency(calcInvoiceRestPlata()) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showInvoiceModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveInvoice">
            <span class="material-icons-outlined">receipt_long</span>
            Emite Factură
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
