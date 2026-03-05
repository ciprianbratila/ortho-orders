<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFacturiStore } from '../stores/facturi'
import { useToastStore } from '../stores/toast'
import type { Factura, StatusFactura } from '../types'
import * as XLSX from 'xlsx'

const facturiStore = useFacturiStore()
const toast = useToastStore()
const searchQuery = ref('')
const filterStatus = ref<string>('all')
const filterClient = ref('')
const filterDataDeLa = ref('')
const filterDataPanaLa = ref('')
const showFilters = ref(false)
const showPreviewModal = ref(false)
const showDeleteConfirm = ref(false)
const previewFactura = ref<Factura | null>(null)
const deleteTargetId = ref<string | null>(null)

const statusOptions = [
  { value: 'emisa', label: 'Emisă' },
  { value: 'achitata', label: 'Achitată' },
  { value: 'anulata', label: 'Anulată' },
]

const statusLabels: Record<string, string> = {
  emisa: 'Emisă',
  achitata: 'Achitată',
  anulata: 'Anulată',
}

const statusColors: Record<string, string> = {
  emisa: '#3b82f6',
  achitata: '#10b981',
  anulata: '#ef4444',
}

const metodaPlataLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  decizie_cas: 'Decizie CAS',
}

// Unique client names for filter dropdown
const uniqueClients = computed(() => {
  const set = new Map<string, string>()
  for (const f of facturiStore.items) {
    const key = `${f.dateClient.nume} ${f.dateClient.prenume}`
    if (!set.has(key)) set.set(key, key)
  }
  return Array.from(set.values()).sort()
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filterStatus.value !== 'all') count++
  if (filterClient.value) count++
  if (filterDataDeLa.value) count++
  if (filterDataPanaLa.value) count++
  return count
})

const filteredItems = computed(() => {
  let items = facturiStore.items

  // Status filter
  if (filterStatus.value !== 'all') {
    items = items.filter(f => f.status === filterStatus.value)
  }

  // Client filter
  if (filterClient.value) {
    items = items.filter(f => `${f.dateClient.nume} ${f.dateClient.prenume}` === filterClient.value)
  }

  // Date range filter
  if (filterDataDeLa.value) {
    const from = new Date(filterDataDeLa.value)
    items = items.filter(f => new Date(f.dataEmitere) >= from)
  }
  if (filterDataPanaLa.value) {
    const to = new Date(filterDataPanaLa.value)
    to.setHours(23, 59, 59, 999)
    items = items.filter(f => new Date(f.dataEmitere) <= to)
  }

  // Text search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(f =>
      f.numarFactura.toLowerCase().includes(q) ||
      f.numarComanda.toLowerCase().includes(q) ||
      `${f.dateClient.nume} ${f.dateClient.prenume}`.toLowerCase().includes(q)
    )
  }

  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function clearFilters() {
  filterStatus.value = 'all'
  filterClient.value = ''
  filterDataDeLa.value = ''
  filterDataPanaLa.value = ''
  searchQuery.value = ''
}

function openPreview(factura: Factura) {
  previewFactura.value = factura
  showPreviewModal.value = true
}

function changeStatus(id: string, status: string) {
  facturiStore.updateStatus(id, status as StatusFactura)
  toast.success(`Status factură actualizat: ${statusLabels[status]}`)
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (deleteTargetId.value) {
    facturiStore.remove(deleteTargetId.value)
    toast.success('Factură ștearsă!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateExcel(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

function formatCurrencyExcel(val: number): number {
  return Math.round(val * 100) / 100
}

// ============ XLSX Export ============
async function exportToXlsx() {
  if (filteredItems.value.length === 0) {
    toast.warning('Nu există facturi de exportat cu filtrele curente!')
    return
  }

  try {
    // Prepare data rows
    const rows = filteredItems.value.map(f => ({
      'Nr. Factură': f.numarFactura,
      'Nr. Comandă': f.numarComanda,
      'Client': `${f.dateClient.nume} ${f.dateClient.prenume}`,
      'CNP Client': f.dateClient.cnp || '',
      'Telefon Client': f.dateClient.telefon || '',
      'Adresă Client': f.dateClient.adresa || '',
      'Data Emitere': formatDateExcel(f.dataEmitere),
      'Data Scadență': formatDateExcel(f.dataScadenta),
      'Status': statusLabels[f.status] || f.status,
      'Metodă Plată': metodaPlataLabels[f.metodaPlata] || f.metodaPlata,
      'Subtotal (RON)': formatCurrencyExcel(f.subtotal),
      'TVA (%)': f.tva,
      'Total TVA (RON)': formatCurrencyExcel(f.totalTVA),
      'Total Factură (RON)': formatCurrencyExcel(f.totalFactura),
      'Avans (RON)': formatCurrencyExcel(f.avans),
      'Decizie CAS (RON)': formatCurrencyExcel(f.decizieCASValoare),
      'Rest Plată (RON)': formatCurrencyExcel(f.restPlata),
      'Observații': f.observatii || '',
    }))

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 15 },
      { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 },
      { wch: 14 }, { wch: 30 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturi')

    // Generate filename
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    let filename = `Facturi_${dateStr}`
    if (filterStatus.value !== 'all') filename += `_${statusLabels[filterStatus.value]}`
    if (filterClient.value) filename += `_${filterClient.value.replace(/\s+/g, '_')}`
    filename += '.xlsx'

    // Write workbook to buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    // Use File System Access API (native Save As dialog)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Fișier Excel',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        toast.success(`${filteredItems.value.length} facturi salvate cu succes!`)
        return
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') return // User cancelled
        console.warn('Save picker failed, falling back:', pickerErr)
      }
    }

    // Fallback: download via <a> element
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
    toast.success(`${filteredItems.value.length} facturi exportate în ${filename}`)
  } catch (err: any) {
    console.error('Eroare export XLSX:', err)
    toast.error('Eroare la exportul fișierului XLSX: ' + (err.message || 'eroare necunoscută'))
  }
}

function generateInvoiceHTML(factura: Factura): string {
  const liniiHTML = factura.linii.map((l, i) => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${i + 1}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${l.denumire}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${l.cantitate}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px;">${formatCurrency(l.pretUnitar)}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 13px;">${formatCurrency(l.total)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <title>Factură ${factura.numarFactura}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1f2937; background: #fff; padding: 40px; }
        .invoice-container { max-width: 800px; margin: 0 auto; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #0d9488; padding-bottom: 24px;">
          <div>
            <h1 style="font-size: 28px; color: #0d9488; margin-bottom: 4px;">OrthoOrders</h1>
            <p style="color: #6b7280; font-size: 13px;">Management Comenzi Ortopedice</p>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; color: #374151; margin-bottom: 6px;">FACTURĂ</h2>
            <p style="font-size: 15px; font-weight: 600; color: #0d9488;">${factura.numarFactura}</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Comandă: ${factura.numarComanda}</p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
          <div style="flex: 1;">
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px;">Furnizor</h4>
            <p style="font-weight: 600; font-size: 14px;">OrthoOrders SRL</p>
            <p style="font-size: 13px; color: #6b7280;">Str. Exemplu nr. 1</p>
            <p style="font-size: 13px; color: #6b7280;">București, România</p>
            <p style="font-size: 13px; color: #6b7280;">CUI: RO12345678</p>
          </div>
          <div style="flex: 1; text-align: right;">
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px;">Client</h4>
            <p style="font-weight: 600; font-size: 14px;">${factura.dateClient.nume} ${factura.dateClient.prenume}</p>
            <p style="font-size: 13px; color: #6b7280;">CNP: ${factura.dateClient.cnp || '—'}</p>
            <p style="font-size: 13px; color: #6b7280;">${factura.dateClient.adresa || ''}</p>
            <p style="font-size: 13px; color: #6b7280;">${factura.dateClient.telefon || ''}</p>
          </div>
        </div>

        <div style="display: flex; gap: 32px; margin-bottom: 28px;">
          <div>
            <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Data Emitere</span>
            <p style="font-weight: 500; font-size: 14px;">${formatDate(factura.dataEmitere)}</p>
          </div>
          <div>
            <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Data Scadență</span>
            <p style="font-weight: 500; font-size: 14px;">${formatDate(factura.dataScadenta)}</p>
          </div>
          <div>
            <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Metoda Plată</span>
            <p style="font-weight: 500; font-size: 14px;">${metodaPlataLabels[factura.metodaPlata] || factura.metodaPlata}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Nr.</th>
              <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Denumire</th>
              <th style="padding: 10px 14px; text-align: center; font-size: 11px; text-transform: uppercase; color: #6b7280;">Cant.</th>
              <th style="padding: 10px 14px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280;">Preț Unitar</th>
              <th style="padding: 10px 14px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280;">Total</th>
            </tr>
          </thead>
          <tbody>${liniiHTML}</tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span>${formatCurrency(factura.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
              <span style="color: #6b7280;">TVA (${factura.tva}%)</span>
              <span>${formatCurrency(factura.totalTVA)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: 700; border-top: 2px solid #1f2937; margin-top: 6px;">
              <span>Total Factură</span>
              <span style="color: #0d9488;">${formatCurrency(factura.totalFactura)}</span>
            </div>
            ${factura.avans > 0 ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #6b7280;">
              <span>Avans achitat</span>
              <span style="color: #10b981;">- ${formatCurrency(factura.avans)}</span>
            </div>` : ''}
            ${factura.decizieCASValoare > 0 ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #6b7280;">
              <span>Decizie CAS</span>
              <span style="color: #8b5cf6;">- ${formatCurrency(factura.decizieCASValoare)}</span>
            </div>` : ''}
            ${(factura.avans > 0 || factura.decizieCASValoare > 0) ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e7eb; margin-top: 4px;">
              <span>Rest de plată</span>
              <span style="color: ${factura.restPlata > 0 ? '#f59e0b' : '#10b981'};">${formatCurrency(factura.restPlata)}</span>
            </div>` : ''}
          </div>
        </div>

        ${factura.observatii ? `
          <div style="margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h4 style="font-size: 11px; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px;">Observații</h4>
            <p style="font-size: 13px; color: #4b5563;">${factura.observatii}</p>
          </div>
        ` : ''}

        <div style="margin-top: 48px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Factura este generată electronic și nu necesită semnătură sau ștampilă.
        </div>
      </div>
    </body>
    </html>
  `
}

function downloadPDF(factura: Factura) {
  const html = generateInvoiceHTML(factura)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 400)
  }
  toast.success('Factura se descarcă...')
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">receipt_long</span>
        </div>
        <div class="stat-info">
          <h3>{{ facturiStore.totalItems }}</h3>
          <p>Total Facturi</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">pending_actions</span>
        </div>
        <div class="stat-info">
          <h3>{{ facturiStore.facturiEmise.length }}</h3>
          <p>Facturi Emise</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-outlined">check_circle</span>
        </div>
        <div class="stat-info">
          <h3>{{ facturiStore.facturiAchitate.length }}</h3>
          <p>Facturi Achitate</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-outlined">payments</span>
        </div>
        <div class="stat-info">
          <h3>{{ formatCurrency(facturiStore.totalVenituri) }}</h3>
          <p>Valoare Totală</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="search-box">
            <span class="material-icons-outlined">search</span>
            <input v-model="searchQuery" type="text" placeholder="Caută factură, comandă, client..." />
          </div>
          <button class="btn btn-secondary btn-sm" @click="showFilters = !showFilters" style="display: flex; align-items: center; gap: 6px; position: relative;">
            <span class="material-icons-outlined" style="font-size: 18px;">filter_list</span>
            Filtre
            <span v-if="activeFilterCount > 0" style="position: absolute; top: -6px; right: -6px; background: var(--text-accent); color: white; width: 18px; height: 18px; border-radius: 50%; font-size: 0.68rem; display: flex; align-items: center; justify-content: center; font-weight: 700;">
              {{ activeFilterCount }}
            </span>
          </button>
        </div>
        <button class="btn btn-primary" @click="exportToXlsx" style="display: flex; align-items: center; gap: 6px;">
          <span class="material-icons-outlined" style="font-size: 18px;">file_download</span>
          Export XLSX ({{ filteredItems.length }})
        </button>
      </div>

      <!-- Expanded Filter Panel -->
      <div v-if="showFilters" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; align-items: end;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.75rem;">Status</label>
            <select v-model="filterStatus" class="form-select">
              <option value="all">Toate Statusurile</option>
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.75rem;">Client</label>
            <select v-model="filterClient" class="form-select">
              <option value="">Toți Clienții</option>
              <option v-for="c in uniqueClients" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.75rem;">Data emitere de la</label>
            <input v-model="filterDataDeLa" class="form-input" type="date" />
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.75rem;">Data emitere până la</label>
            <input v-model="filterDataPanaLa" class="form-input" type="date" />
          </div>
          <div style="display: flex; align-items: flex-end;">
            <button v-if="activeFilterCount > 0" class="btn btn-ghost btn-sm" @click="clearFilters" style="color: var(--error); white-space: nowrap;">
              <span class="material-icons-outlined" style="font-size: 16px;">clear</span>
              Resetează filtre
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredItems.length > 0" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nr. Factură</th>
            <th>Nr. Comandă</th>
            <th>Client</th>
            <th>Data Emitere</th>
            <th>Status</th>
            <th>Subtotal</th>
            <th>TVA</th>
            <th>Total</th>
            <th>Rest Plată</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>
              <span style="font-weight: 600; color: var(--text-accent); cursor: pointer;" @click="openPreview(item)">
                {{ item.numarFactura }}
              </span>
            </td>
            <td style="font-size: 0.84rem; color: var(--text-secondary);">{{ item.numarComanda }}</td>
            <td>{{ item.dateClient.nume }} {{ item.dateClient.prenume }}</td>
            <td style="font-size: 0.84rem; color: var(--text-secondary);">{{ formatDate(item.dataEmitere) }}</td>
            <td>
              <select
                :value="item.status"
                class="form-select"
                style="width: 120px; padding: 5px 30px 5px 10px; font-size: 0.8rem; border-radius: 8px;"
                :style="{ color: statusColors[item.status], borderColor: statusColors[item.status] + '40' }"
                @change="changeStatus(item.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </td>
            <td>{{ formatCurrency(item.subtotal) }}</td>
            <td style="font-size: 0.82rem; color: var(--text-muted);">{{ formatCurrency(item.totalTVA) }}</td>
            <td style="font-weight: 600;">{{ formatCurrency(item.totalFactura) }}</td>
            <td style="font-weight: 500;" :style="{ color: item.restPlata > 0 ? 'var(--warning)' : 'var(--success)' }">
              {{ formatCurrency(item.restPlata) }}
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openPreview(item)" title="Previzualizare">
                  <span class="material-icons-outlined">visibility</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="downloadPDF(item)" title="Descarcă PDF">
                  <span class="material-icons-outlined">picture_as_pdf</span>
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
      <span class="material-icons-outlined">receipt_long</span>
      <h3>Nicio factură</h3>
      <p>Facturile se generează din lista de comenzi folosind acțiunea de facturare.</p>
    </div>

    <!-- ==================== Preview Modal ==================== -->
    <div v-if="showPreviewModal && previewFactura" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="modal" style="width: min(850px, 95vw); max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined" style="color: var(--text-accent);">receipt_long</span>
            Factură {{ previewFactura.numarFactura }}
          </h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm" @click="downloadPDF(previewFactura)">
              <span class="material-icons-outlined">picture_as_pdf</span>
              Descarcă PDF
            </button>
            <button class="btn btn-ghost btn-icon" @click="showPreviewModal = false">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <!-- Invoice Preview -->
          <div style="background: #fff; color: #1f2937; border-radius: var(--radius-lg); padding: 32px; border: 1px solid var(--border-color);">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #0d9488; padding-bottom: 20px;">
              <div>
                <h2 style="font-size: 1.5rem; color: #0d9488; margin: 0;">OrthoOrders</h2>
                <p style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Management Comenzi Ortopedice</p>
              </div>
              <div style="text-align: right;">
                <h3 style="font-size: 1.3rem; color: #374151; margin: 0 0 4px;">FACTURĂ</h3>
                <p style="font-weight: 600; color: #0d9488;">{{ previewFactura.numarFactura }}</p>
                <p style="font-size: 0.78rem; color: #6b7280; margin-top: 2px;">Comandă: {{ previewFactura.numarComanda }}</p>
              </div>
            </div>

            <!-- Client & Details -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
              <div>
                <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px; letter-spacing: 0.05em;">Client</div>
                <p style="font-weight: 600; font-size: 0.95rem;">{{ previewFactura.dateClient.nume }} {{ previewFactura.dateClient.prenume }}</p>
                <p style="font-size: 0.82rem; color: #6b7280;">CNP: {{ previewFactura.dateClient.cnp || '—' }}</p>
                <p v-if="previewFactura.dateClient.adresa" style="font-size: 0.82rem; color: #6b7280;">{{ previewFactura.dateClient.adresa }}</p>
                <p v-if="previewFactura.dateClient.telefon" style="font-size: 0.82rem; color: #6b7280;">Tel: {{ previewFactura.dateClient.telefon }}</p>
              </div>
              <div style="text-align: right;">
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase;">Data Emitere</span>
                  <p style="font-weight: 500;">{{ formatDate(previewFactura.dataEmitere) }}</p>
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase;">Data Scadență</span>
                  <p style="font-weight: 500;">{{ formatDate(previewFactura.dataScadenta) }}</p>
                </div>
                <div>
                  <span style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase;">Metoda Plată</span>
                  <p style="font-weight: 500;">{{ metodaPlataLabels[previewFactura.metodaPlata] }}</p>
                </div>
              </div>
            </div>

            <!-- Products Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Nr.</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: #6b7280;">Denumire</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: #6b7280;">Cant.</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 0.7rem; text-transform: uppercase; color: #6b7280;">Preț Unitar</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 0.7rem; text-transform: uppercase; color: #6b7280;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(linie, idx) in previewFactura.linii" :key="idx">
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.84rem;">{{ idx + 1 }}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.84rem;">{{ linie.denumire }}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 0.84rem;">{{ linie.cantitate }}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 0.84rem;">{{ formatCurrency(linie.pretUnitar) }}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 0.84rem;">{{ formatCurrency(linie.total) }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end;">
              <div style="width: 280px;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.85rem;">
                  <span style="color: #6b7280;">Subtotal</span>
                  <span>{{ formatCurrency(previewFactura.subtotal) }}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.85rem;">
                  <span style="color: #6b7280;">TVA ({{ previewFactura.tva }}%)</span>
                  <span>{{ formatCurrency(previewFactura.totalTVA) }}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 1.05rem; font-weight: 700; border-top: 2px solid #1f2937; margin-top: 4px;">
                  <span>Total</span>
                  <span style="color: #0d9488;">{{ formatCurrency(previewFactura.totalFactura) }}</span>
                </div>
                <div v-if="previewFactura.avans > 0" style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.8rem; color: #6b7280;">
                  <span>Avans achitat</span>
                  <span style="color: #10b981;">- {{ formatCurrency(previewFactura.avans) }}</span>
                </div>
                <div v-if="previewFactura.decizieCASValoare > 0" style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.8rem; color: #6b7280;">
                  <span>Decizie CAS</span>
                  <span style="color: #8b5cf6;">- {{ formatCurrency(previewFactura.decizieCASValoare) }}</span>
                </div>
                <div v-if="previewFactura.avans > 0 || previewFactura.decizieCASValoare > 0" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.92rem; font-weight: 600; border-top: 1px solid #e5e7eb; margin-top: 4px;">
                  <span>Rest de plată</span>
                  <span :style="{ color: previewFactura.restPlata > 0 ? '#f59e0b' : '#10b981' }">{{ formatCurrency(previewFactura.restPlata) }}</span>
                </div>
              </div>
            </div>

            <!-- Observatii -->
            <div v-if="previewFactura.observatii" style="margin-top: 24px; padding: 14px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px;">Observații</div>
              <p style="font-size: 0.84rem; color: #4b5563;">{{ previewFactura.observatii }}</p>
            </div>
          </div>

          <!-- Status badge -->
          <div style="display: flex; justify-content: center; margin-top: 16px;">
            <span
              style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 0.82rem;"
              :style="{ background: statusColors[previewFactura.status] + '20', color: statusColors[previewFactura.status] }"
            >
              <span class="material-icons-outlined" style="font-size: 16px;">{{ previewFactura.status === 'achitata' ? 'check_circle' : previewFactura.status === 'emisa' ? 'pending_actions' : 'cancel' }}</span>
              {{ statusLabels[previewFactura.status] }}
            </span>
          </div>
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
            <p>Sigur doriți să ștergeți această factură?</p>
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
