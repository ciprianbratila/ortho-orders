<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProduseStore } from '../stores/produse'
import { useMateriiPrimeStore } from '../stores/materiiPrime'
import { useToastStore } from '../stores/toast'
import type { Produs, ComponentaProdus } from '../types'

const store = useProduseStore()
const materiiStore = useMateriiPrimeStore()
const toast = useToastStore()

const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)
const showCopyDialog = ref(false)
const copySourceId = ref('')

const form = ref({
  denumire: '',
  descriere: '',
  produsParinteId: '' as string,
  componente: [] as ComponentaProdus[],
  pretManopera: 0,
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return store.items
  const q = searchQuery.value.toLowerCase()
  return store.items.filter(item =>
    item.denumire.toLowerCase().includes(q) || item.descriere.toLowerCase().includes(q)
  )
})

// Produse fără părinte = produse de bază
const produseBaza = computed(() => store.items.filter(p => !p.produsParinteId))
const produseDerivate = computed(() => store.items.filter(p => p.produsParinteId))

function getMaterieName(id: string): string {
  const m = materiiStore.getById(id)
  return m ? m.denumire : 'N/A'
}

function getMaterieUnit(id: string): string {
  const m = materiiStore.getById(id)
  return m ? m.unitateMasura : ''
}

function getParinteName(id?: string): string {
  if (!id) return ''
  const p = store.getById(id)
  return p ? p.denumire : ''
}

// Exclude produsul curent și derivatele sale din lista de posibili părinți
function getAvailableParents(): Produs[] {
  return store.items.filter(p => {
    if (editingId.value && p.id === editingId.value) return false
    // nu permite ca un descendent să fie părinte (evită cicluri)
    if (editingId.value && isDescendant(p.id, editingId.value)) return false
    return true
  })
}

function isDescendant(produsId: string, ancestorId: string): boolean {
  const produs = store.getById(produsId)
  if (!produs || !produs.produsParinteId) return false
  if (produs.produsParinteId === ancestorId) return true
  return isDescendant(produs.produsParinteId, ancestorId)
}

function openAdd() {
  editingId.value = null
  form.value = { denumire: '', descriere: '', produsParinteId: '', componente: [], pretManopera: 0 }
  showModal.value = true
}

function openEdit(item: Produs) {
  editingId.value = item.id
  form.value = {
    denumire: item.denumire,
    descriere: item.descriere,
    produsParinteId: item.produsParinteId || '',
    componente: [...item.componente.map(c => ({ ...c }))],
    pretManopera: item.pretManopera,
  }
  showModal.value = true
}

function addComponent() {
  if (materiiStore.items.length === 0) {
    toast.warning('Adaugă mai întâi materii prime!')
    return
  }
  form.value.componente.push({
    materiePrimaId: materiiStore.items[0].id,
    cantitate: 1,
  })
}

function removeComponent(index: number) {
  form.value.componente.splice(index, 1)
}

// Copy materials from another product
function openCopyDialog() {
  if (store.items.length === 0) {
    toast.warning('Nu există produse din care să copiezi!')
    return
  }
  copySourceId.value = store.items[0].id
  showCopyDialog.value = true
}

function executeCopy() {
  const source = store.getById(copySourceId.value)
  if (!source) return
  const allComps = store.getToateComponentele(source)
  form.value.componente = allComps.map(c => ({ ...c }))
  showCopyDialog.value = false
  toast.success(`Componente copiate de la "${source.denumire}"`)
}

// Price calculation for current form
function calcPretComponenteProprii(): number {
  return store.calculeazaPretComponenteProprii(form.value.componente)
}

function calcPretParinte(): number {
  if (!form.value.produsParinteId) return 0
  const parinte = store.getById(form.value.produsParinteId)
  if (!parinte) return 0
  return store.calculeazaPretProdus(parinte)
}

function calcPretTotal(): number {
  return calcPretComponenteProprii() + form.value.pretManopera + calcPretParinte()
}

function save() {
  if (!form.value.denumire.trim()) {
    toast.error('Denumirea este obligatorie!')
    return
  }

  // Validare duplicat
  const duplicat = store.verificaDuplicat(
    form.value.componente,
    form.value.produsParinteId || undefined,
    editingId.value || undefined
  )
  if (duplicat) {
    toast.error(`Produs duplicat! Combinația de materiale este identică cu "${duplicat}".`)
    return
  }

  const payload: any = {
    ...form.value,
    produsParinteId: form.value.produsParinteId || undefined,
  }

  if (editingId.value) {
    store.update(editingId.value, payload)
    toast.success('Produs actualizat cu succes!')
  } else {
    store.add(payload)
    toast.success('Produs adăugat cu succes!')
  }
  showModal.value = false
}

function confirmDelete(id: string) {
  const derivate = store.getProduseDerivate(id)
  if (derivate.length > 0) {
    toast.error(`Nu poți șterge! ${derivate.length} produs(e) derivat(e) depind de acest produs: ${derivate.map(d => d.denumire).join(', ')}`)
    return
  }
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (deleteTargetId.value) {
    store.remove(deleteTargetId.value)
    toast.success('Produs șters!')
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}
</script>

<template>
  <div>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">category</span>
        </div>
        <div class="stat-info">
          <h3>{{ store.totalItems }}</h3>
          <p>Total Produse</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-outlined">widgets</span>
        </div>
        <div class="stat-info">
          <h3>{{ produseBaza.length }}</h3>
          <p>Produse de Bază</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-outlined">account_tree</span>
        </div>
        <div class="stat-info">
          <h3>{{ produseDerivate.length }}</h3>
          <p>Produse Derivate</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div class="search-box">
          <span class="material-icons-outlined">search</span>
          <input v-model="searchQuery" type="text" placeholder="Caută produs..." />
        </div>
        <button class="btn btn-primary" @click="openAdd">
          <span class="material-icons-outlined">add</span>
          Adaugă Produs
        </button>
      </div>
    </div>

    <!-- Product Cards Grid -->
    <div v-if="filteredItems.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px;">
      <div v-for="item in filteredItems" :key="item.id" class="card" style="padding: 20px; position: relative;">
        <!-- Derivat Badge -->
        <div v-if="item.produsParinteId" style="position: absolute; top: 12px; right: 12px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; background: rgba(139, 92, 246, 0.15); color: #a78bfa;">
            <span class="material-icons-outlined" style="font-size: 12px;">account_tree</span>
            Derivat din {{ getParinteName(item.produsParinteId) }}
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-right: 0;">
          <div style="max-width: 75%;">
            <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">{{ item.denumire }}</div>
            <div v-if="item.descriere" style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">{{ item.descriere }}</div>
          </div>
          <div class="table-actions" v-if="!item.produsParinteId">
            <button class="btn btn-ghost btn-icon btn-sm" @click="openEdit(item)" title="Editează">
              <span class="material-icons-outlined">edit</span>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDelete(item.id)" title="Șterge" style="color: var(--error);">
              <span class="material-icons-outlined">delete</span>
            </button>
          </div>
          <div class="table-actions" v-else>
            <button class="btn btn-ghost btn-icon btn-sm" @click="openEdit(item)" title="Editează">
              <span class="material-icons-outlined">edit</span>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDelete(item.id)" title="Șterge" style="color: var(--error);">
              <span class="material-icons-outlined">delete</span>
            </button>
          </div>
        </div>

        <!-- Parent Componente (if nested) -->
        <div v-if="item.produsParinteId" style="margin-bottom: 8px;">
          <div style="font-size: 0.72rem; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-outlined" style="font-size: 13px;">inventory_2</span>
            Componente moștenite ({{ getParinteName(item.produsParinteId) }})
          </div>
          <div v-for="(comp, idx) in (store.getById(item.produsParinteId)?.componente || [])" :key="'p'+idx" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; border-radius: 6px; background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.1); margin-bottom: 3px; font-size: 0.82rem;">
            <span style="color: #c4b5fd;">{{ getMaterieName(comp.materiePrimaId) }}</span>
            <span style="color: rgba(196, 181, 253, 0.6);">{{ comp.cantitate }} {{ getMaterieUnit(comp.materiePrimaId) }}</span>
          </div>
        </div>

        <!-- Own Componente -->
        <div v-if="item.componente.length > 0" style="margin-bottom: 12px;">
          <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
            {{ item.produsParinteId ? 'Componente adiționale' : 'Componente' }}
          </div>
          <div v-for="(comp, idx) in item.componente" :key="idx" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; border-radius: 6px; background: var(--bg-tertiary); margin-bottom: 3px; font-size: 0.82rem;">
            <span>{{ getMaterieName(comp.materiePrimaId) }}</span>
            <span style="color: var(--text-muted);">{{ comp.cantitate }} {{ getMaterieUnit(comp.materiePrimaId) }}</span>
          </div>
        </div>

        <!-- Preturi -->
        <div style="padding-top: 12px; border-top: 1px solid var(--border-color);">
          <div v-if="item.produsParinteId" style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.82rem;">
            <span style="color: #a78bfa;">Cost bază ({{ getParinteName(item.produsParinteId) }})</span>
            <span style="color: #a78bfa;">{{ formatCurrency(store.calculeazaPretProdus(store.getById(item.produsParinteId)!)) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.82rem;">
            <span style="color: var(--text-muted);">{{ item.produsParinteId ? 'Cost adițional' : 'Cost materiale' }}</span>
            <span>{{ formatCurrency(store.calculeazaPretComponenteProprii(item.componente)) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.82rem;">
            <span style="color: var(--text-muted);">Manoperă proprie</span>
            <span>{{ formatCurrency(item.pretManopera) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px dashed var(--border-color);">
            <span style="font-size: 0.82rem; color: var(--text-muted);">Preț Total</span>
            <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-accent);">{{ formatCurrency(store.calculeazaPretProdus(item)) }}</span>
          </div>
        </div>

        <!-- Derivate count -->
        <div v-if="store.getProduseDerivate(item.id).length > 0" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-color);">
          <span style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-outlined" style="font-size: 14px;">account_tree</span>
            {{ store.getProduseDerivate(item.id).length }} produs(e) derivat(e)
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state card">
      <span class="material-icons-outlined">category</span>
      <h3>Niciun produs în catalog</h3>
      <p>Adaugă produse și configurează componentele lor din materii prime.</p>
      <button class="btn btn-primary" @click="openAdd">
        <span class="material-icons-outlined">add</span>
        Adaugă Produs
      </button>
    </div>

    <!-- ==================== Add/Edit Modal ==================== -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editingId ? 'Editează Produs' : 'Adaugă Produs' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Denumire Produs *</label>
            <input v-model="form.denumire" class="form-input" type="text" placeholder="ex: Pantof ortopedic standard" />
          </div>
          <div class="form-group">
            <label class="form-label">Descriere</label>
            <textarea v-model="form.descriere" class="form-textarea" placeholder="Descriere opțională..."></textarea>
          </div>

          <!-- Produs Părinte (Nested Product) -->
          <div class="form-group">
            <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size: 16px; color: #a78bfa;">account_tree</span>
              Produs de Bază (opțional)
            </label>
            <select v-model="form.produsParinteId" class="form-select">
              <option value="">— Niciun produs de bază (produs independent) —</option>
              <option v-for="p in getAvailableParents()" :key="p.id" :value="p.id">
                {{ p.denumire }} — {{ formatCurrency(store.calculeazaPretProdus(p)) }}
              </option>
            </select>
            <div v-if="form.produsParinteId" style="margin-top: 8px; padding: 12px; background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: var(--radius-md);">
              <div style="font-size: 0.75rem; font-weight: 600; color: #a78bfa; text-transform: uppercase; margin-bottom: 8px;">
                📦 Componente moștenite de la "{{ getParinteName(form.produsParinteId) }}"
              </div>
              <div v-for="(comp, idx) in (store.getById(form.produsParinteId)?.componente || [])" :key="'parent'+idx" style="display: flex; justify-content: space-between; font-size: 0.82rem; padding: 3px 0; color: #c4b5fd;">
                <span>{{ getMaterieName(comp.materiePrimaId) }}</span>
                <span>{{ comp.cantitate }} {{ getMaterieUnit(comp.materiePrimaId) }}</span>
              </div>
              <div style="font-size: 0.78rem; color: #a78bfa; margin-top: 6px; font-weight: 500;">
                Cost bază: {{ formatCurrency(calcPretParinte()) }}
              </div>
            </div>
          </div>

          <!-- Componente -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <label class="form-label" style="margin-bottom: 0;">
                {{ form.produsParinteId ? 'Componente Adiționale' : 'Componente Materii Prime' }}
              </label>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" @click="openCopyDialog" title="Copiază componente de la alt produs">
                  <span class="material-icons-outlined">content_copy</span>
                  Copiază de la...
                </button>
                <button class="btn btn-secondary btn-sm" @click="addComponent">
                  <span class="material-icons-outlined">add</span>
                  Adaugă Componentă
                </button>
              </div>
            </div>
            <div v-if="form.componente.length === 0" style="padding: 20px; text-align: center; border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.85rem;">
              {{ form.produsParinteId ? 'Nicio componentă adițională (va moșteni numai de la produsul de bază)' : 'Nicio componentă adăugată' }}
            </div>
            <div v-for="(comp, idx) in form.componente" :key="idx" style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
              <select v-model="comp.materiePrimaId" class="form-select" style="flex: 2;">
                <option v-for="m in materiiStore.items" :key="m.id" :value="m.id">
                  {{ m.denumire }} ({{ formatCurrency(m.pret) }}/{{ m.unitateMasura }})
                </option>
              </select>
              <input v-model.number="comp.cantitate" class="form-input" type="number" min="0.01" step="0.01" style="flex: 1;" placeholder="Cant." />
              <button class="btn btn-ghost btn-icon" @click="removeComponent(idx)" style="color: var(--error);">
                <span class="material-icons-outlined">remove_circle</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Preț Manoperă proprie (RON)</label>
            <input v-model.number="form.pretManopera" class="form-input" type="number" min="0" step="0.01" />
          </div>

          <!-- Preview Pret -->
          <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px; margin-top: 12px;">
            <div v-if="form.produsParinteId" style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
              <span style="color: #a78bfa;">Cost produs bază</span>
              <span style="color: #a78bfa;">{{ formatCurrency(calcPretParinte()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Cost componente proprii</span>
              <span>{{ formatCurrency(calcPretComponenteProprii()) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Manoperă proprie</span>
              <span>{{ formatCurrency(form.pretManopera) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 2px solid var(--border-color);">
              <span style="font-weight: 600; color: var(--text-secondary);">Preț Total</span>
              <span style="font-size: 1.3rem; font-weight: 700; color: var(--text-accent);">{{ formatCurrency(calcPretTotal()) }}</span>
            </div>
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

    <!-- Copy Dialog -->
    <div v-if="showCopyDialog" class="modal-overlay" @click.self="showCopyDialog = false">
      <div class="modal" style="width: min(480px, 90vw);">
        <div class="modal-header">
          <h3>Copiază Componente</h3>
          <button class="btn btn-ghost btn-icon" @click="showCopyDialog = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Selectează produsul sursă</label>
            <select v-model="copySourceId" class="form-select">
              <option v-for="p in store.items" :key="p.id" :value="p.id">
                {{ p.denumire }} ({{ store.getToateComponentele(p).length }} componente)
              </option>
            </select>
          </div>
          <div v-if="copySourceId" style="margin-top: 10px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Componente care vor fi copiate</div>
            <div v-for="(comp, idx) in store.getToateComponentele(store.getById(copySourceId)!)" :key="idx" style="display: flex; justify-content: space-between; font-size: 0.84rem; padding: 3px 0;">
              <span>{{ getMaterieName(comp.materiePrimaId) }}</span>
              <span style="color: var(--text-muted);">{{ comp.cantitate }} {{ getMaterieUnit(comp.materiePrimaId) }}</span>
            </div>
          </div>
          <div style="margin-top: 10px; font-size: 0.8rem; color: var(--warning);">
            ⚠ Componentele existente vor fi înlocuite cu cele copiate.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCopyDialog = false">Anulează</button>
          <button class="btn btn-primary" @click="executeCopy">
            <span class="material-icons-outlined">content_copy</span>
            Copiază
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
            <p>Sigur doriți să ștergeți acest produs?</p>
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
