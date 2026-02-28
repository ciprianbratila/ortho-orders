<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import type { ModulAcces } from '../types'

const auth = useAuthStore()
const toast = useToastStore()

const activeTab = ref<'users' | 'groups'>('users')

// ====== Module definitions ======
const allModules: { value: ModulAcces; label: string; icon: string }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { value: 'comenzi', label: 'Comenzi', icon: 'shopping_cart' },
  { value: 'facturi', label: 'Facturi', icon: 'receipt_long' },
  { value: 'clienti', label: 'Clienți', icon: 'people' },
  { value: 'angajati', label: 'Angajați', icon: 'badge' },
  { value: 'produse', label: 'Produse', icon: 'category' },
  { value: 'materii-prime', label: 'Materii Prime', icon: 'inventory_2' },
  { value: 'admin', label: 'Administrare', icon: 'admin_panel_settings' },
]

// ====== Users ======
const showUserModal = ref(false)
const editingUserId = ref<string | null>(null)
const showDeleteUserConfirm = ref(false)
const deleteUserTargetId = ref<string | null>(null)
const userSearch = ref('')

const userForm = ref({
  username: '',
  parola: '1234',
  nume: '',
  prenume: '',
  email: '',
  grupId: '',
  activ: true,
})

const filteredUsers = computed(() => {
  if (!userSearch.value) return auth.users
  const q = userSearch.value.toLowerCase()
  return auth.users.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.nume.toLowerCase().includes(q) ||
    u.prenume.toLowerCase().includes(q)
  )
})

function openAddUser() {
  editingUserId.value = null
  userForm.value = { username: '', parola: '1234', nume: '', prenume: '', email: '', grupId: auth.groups[0]?.id || '', activ: true }
  showUserModal.value = true
}

function openEditUser(u: any) {
  editingUserId.value = u.id
  userForm.value = {
    username: u.username,
    parola: u.parola,
    nume: u.nume,
    prenume: u.prenume,
    email: u.email,
    grupId: u.grupId,
    activ: u.activ,
  }
  showUserModal.value = true
}

function saveUser() {
  if (!userForm.value.username.trim()) { toast.error('Username-ul este obligatoriu!'); return }
  if (!userForm.value.nume.trim()) { toast.error('Numele este obligatoriu!'); return }
  if (!userForm.value.parola) { toast.error('Parola este obligatorie!'); return }
  if (!userForm.value.grupId) { toast.error('Selectați un grup!'); return }

  // Check unique username
  const existing = auth.users.find(u => u.username === userForm.value.username && u.id !== editingUserId.value)
  if (existing) { toast.error('Username-ul este deja utilizat!'); return }

  if (editingUserId.value) {
    auth.updateUser(editingUserId.value, { ...userForm.value })
    toast.success('Utilizator actualizat!')
  } else {
    auth.addUser({ ...userForm.value })
    toast.success('Utilizator creat cu succes!')
  }
  showUserModal.value = false
}

function confirmDeleteUser(id: string) {
  deleteUserTargetId.value = id
  showDeleteUserConfirm.value = true
}

function executeDeleteUser() {
  if (deleteUserTargetId.value) {
    if (deleteUserTargetId.value === 'user-admin') {
      toast.error('Nu puteți șterge utilizatorul administrator!')
      showDeleteUserConfirm.value = false
      return
    }
    auth.removeUser(deleteUserTargetId.value)
    toast.success('Utilizator șters!')
  }
  showDeleteUserConfirm.value = false
  deleteUserTargetId.value = null
}

function getGroupName(grupId: string): string {
  const g = auth.getGroupById(grupId)
  return g ? g.denumire : '—'
}

// ====== Groups ======
const showGroupModal = ref(false)
const editingGroupId = ref<string | null>(null)
const showDeleteGroupConfirm = ref(false)
const deleteGroupTargetId = ref<string | null>(null)

const groupForm = ref({
  denumire: '',
  descriere: '',
  moduleAcces: [] as ModulAcces[],
})

function openAddGroup() {
  editingGroupId.value = null
  groupForm.value = { denumire: '', descriere: '', moduleAcces: ['dashboard'] }
  showGroupModal.value = true
}

function openEditGroup(g: any) {
  editingGroupId.value = g.id
  groupForm.value = {
    denumire: g.denumire,
    descriere: g.descriere,
    moduleAcces: [...g.moduleAcces],
  }
  showGroupModal.value = true
}

function toggleModule(mod: ModulAcces) {
  const idx = groupForm.value.moduleAcces.indexOf(mod)
  if (idx >= 0) {
    groupForm.value.moduleAcces.splice(idx, 1)
  } else {
    groupForm.value.moduleAcces.push(mod)
  }
}

function saveGroup() {
  if (!groupForm.value.denumire.trim()) { toast.error('Denumirea grupului este obligatorie!'); return }
  if (groupForm.value.moduleAcces.length === 0) { toast.error('Selectați cel puțin un modul!'); return }

  if (editingGroupId.value) {
    auth.updateGroup(editingGroupId.value, { ...groupForm.value })
    toast.success('Grup actualizat!')
  } else {
    auth.addGroup({ ...groupForm.value })
    toast.success('Grup creat cu succes!')
  }
  showGroupModal.value = false
}

function confirmDeleteGroup(id: string) {
  deleteGroupTargetId.value = id
  showDeleteGroupConfirm.value = true
}

function executeDeleteGroup() {
  if (deleteGroupTargetId.value) {
    if (deleteGroupTargetId.value === 'grup-admin') {
      toast.error('Nu puteți șterge grupul Administratori!')
      showDeleteGroupConfirm.value = false
      return
    }
    const usersInGroup = auth.getUsersByGroup(deleteGroupTargetId.value)
    if (usersInGroup.length > 0) {
      toast.error(`Grupul are ${usersInGroup.length} utilizatori asignați. Mutați-i înainte de ștergere!`)
      showDeleteGroupConfirm.value = false
      return
    }
    auth.removeGroup(deleteGroupTargetId.value)
    toast.success('Grup șters!')
  }
  showDeleteGroupConfirm.value = false
  deleteGroupTargetId.value = null
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
          <h3>{{ auth.users.length }}</h3>
          <p>Total Utilizatori</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-outlined">how_to_reg</span>
        </div>
        <div class="stat-info">
          <h3>{{ auth.users.filter(u => u.activ).length }}</h3>
          <p>Utilizatori Activi</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-outlined">groups</span>
        </div>
        <div class="stat-info">
          <h3>{{ auth.groups.length }}</h3>
          <p>Grupuri</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <span class="material-icons-outlined">security</span>
        </div>
        <div class="stat-info">
          <h3>{{ allModules.length }}</h3>
          <p>Module Disponibile</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="card" style="margin-bottom: 20px; padding: 0;">
      <div style="display: flex; border-bottom: 2px solid var(--border-color);">
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          <span class="material-icons-outlined">people</span>
          Utilizatori ({{ auth.users.length }})
        </button>
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'groups' }"
          @click="activeTab = 'groups'"
        >
          <span class="material-icons-outlined">groups</span>
          Grupuri ({{ auth.groups.length }})
        </button>
      </div>

      <!-- ============ USERS TAB ============ -->
      <div v-if="activeTab === 'users'" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div class="search-box">
            <span class="material-icons-outlined">search</span>
            <input v-model="userSearch" type="text" placeholder="Caută utilizator..." />
          </div>
          <button class="btn btn-primary" @click="openAddUser">
            <span class="material-icons-outlined">person_add</span>
            Adaugă Utilizator
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nume</th>
                <th>Email</th>
                <th>Grup</th>
                <th>Status</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div
                      style="width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; color: white;"
                      :style="{ background: user.grupId === 'grup-admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }"
                    >{{ user.prenume[0] }}{{ user.nume[0] }}</div>
                    <div>
                      <div style="font-weight: 600;">{{ user.username }}</div>
                      <div v-if="user.grupId === 'grup-admin'" style="font-size: 0.68rem; color: #f59e0b;">★ Administrator</div>
                    </div>
                  </div>
                </td>
                <td>{{ user.nume }} {{ user.prenume }}</td>
                <td style="font-size: 0.84rem; color: var(--text-secondary);">{{ user.email }}</td>
                <td>
                  <span
                    style="padding: 3px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 500;"
                    :style="{
                      background: user.grupId === 'grup-admin' ? 'rgba(245,158,11,0.15)' : user.grupId === 'grup-management' ? 'rgba(59,130,246,0.15)' : user.grupId === 'grup-productie' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                      color: user.grupId === 'grup-admin' ? '#f59e0b' : user.grupId === 'grup-management' ? '#3b82f6' : user.grupId === 'grup-productie' ? '#10b981' : '#8b5cf6'
                    }"
                  >{{ getGroupName(user.grupId) }}</span>
                </td>
                <td>
                  <span
                    style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 500;"
                    :style="{ background: user.activ ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: user.activ ? '#10b981' : '#ef4444' }"
                  >
                    <span class="material-icons-outlined" style="font-size: 14px;">{{ user.activ ? 'check_circle' : 'cancel' }}</span>
                    {{ user.activ ? 'Activ' : 'Inactiv' }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" @click="openEditUser(user)" title="Editează">
                      <span class="material-icons-outlined">edit</span>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDeleteUser(user.id)" title="Șterge" style="color: var(--error);">
                      <span class="material-icons-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ GROUPS TAB ============ -->
      <div v-if="activeTab === 'groups'" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 16px;">
          <button class="btn btn-primary" @click="openAddGroup">
            <span class="material-icons-outlined">group_add</span>
            Adaugă Grup
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
          <div v-for="group in auth.groups" :key="group.id" class="group-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <h4 style="font-size: 1rem; margin: 0 0 4px;">
                  <span v-if="group.id === 'grup-admin'" style="color: #f59e0b;">★ </span>
                  {{ group.denumire }}
                </h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">{{ group.descriere }}</p>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-ghost btn-icon btn-sm" @click="openEditGroup(group)" title="Editează">
                  <span class="material-icons-outlined" style="font-size: 18px;">edit</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDeleteGroup(group.id)" title="Șterge" style="color: var(--error);">
                  <span class="material-icons-outlined" style="font-size: 18px;">delete</span>
                </button>
              </div>
            </div>

            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">
              Module Acces ({{ group.moduleAcces.length }}/{{ allModules.length }})
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
              <span
                v-for="mod in allModules"
                :key="mod.value"
                style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 500;"
                :style="{
                  background: group.moduleAcces.includes(mod.value) ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)',
                  color: group.moduleAcces.includes(mod.value) ? '#10b981' : '#64748b',
                }"
              >
                <span class="material-icons-outlined" style="font-size: 14px;">{{ group.moduleAcces.includes(mod.value) ? 'check_circle' : 'block' }}</span>
                {{ mod.label }}
              </span>
            </div>

            <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--border-color); padding-top: 10px;">
              <span class="material-icons-outlined" style="font-size: 16px;">people</span>
              {{ auth.getUsersByGroup(group.id).length }} utilizatori
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== User Modal ========== -->
    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingUserId ? 'Editează Utilizator' : 'Adaugă Utilizator' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showUserModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Username *</label>
              <input v-model="userForm.username" class="form-input" type="text" placeholder="ex: ion.popescu" />
            </div>
            <div class="form-group">
              <label class="form-label">Parola *</label>
              <input v-model="userForm.parola" class="form-input" type="text" placeholder="Parolă" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nume *</label>
              <input v-model="userForm.nume" class="form-input" type="text" />
            </div>
            <div class="form-group">
              <label class="form-label">Prenume</label>
              <input v-model="userForm.prenume" class="form-input" type="text" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="userForm.email" class="form-input" type="email" />
            </div>
            <div class="form-group">
              <label class="form-label">Grup *</label>
              <select v-model="userForm.grupId" class="form-select">
                <option v-for="g in auth.groups" :key="g.id" :value="g.id">{{ g.denumire }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem;">
              <input type="checkbox" v-model="userForm.activ" style="accent-color: var(--text-accent);" />
              Cont activ
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUserModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveUser">
            <span class="material-icons-outlined">{{ editingUserId ? 'save' : 'person_add' }}</span>
            {{ editingUserId ? 'Salvează' : 'Adaugă' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== Group Modal ========== -->
    <div v-if="showGroupModal" class="modal-overlay" @click.self="showGroupModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingGroupId ? 'Editează Grup' : 'Adaugă Grup' }}</h3>
          <button class="btn btn-ghost btn-icon" @click="showGroupModal = false">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Denumire Grup *</label>
            <input v-model="groupForm.denumire" class="form-input" type="text" placeholder="ex: Contabilitate" />
          </div>
          <div class="form-group">
            <label class="form-label">Descriere</label>
            <input v-model="groupForm.descriere" class="form-input" type="text" placeholder="Descriere scurtă..." />
          </div>
          <div class="form-group">
            <label class="form-label">Module Acces *</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              <label
                v-for="mod in allModules"
                :key="mod.value"
                class="module-checkbox"
                :class="{ checked: groupForm.moduleAcces.includes(mod.value) }"
                @click="toggleModule(mod.value)"
              >
                <span class="material-icons-outlined" style="font-size: 18px;">{{ mod.icon }}</span>
                <span style="flex: 1;">{{ mod.label }}</span>
                <span class="material-icons-outlined" style="font-size: 18px;">
                  {{ groupForm.moduleAcces.includes(mod.value) ? 'check_box' : 'check_box_outline_blank' }}
                </span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showGroupModal = false">Anulează</button>
          <button class="btn btn-primary" @click="saveGroup">
            <span class="material-icons-outlined">{{ editingGroupId ? 'save' : 'group_add' }}</span>
            {{ editingGroupId ? 'Salvează' : 'Adaugă' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirms -->
    <div v-if="showDeleteUserConfirm" class="modal-overlay" @click.self="showDeleteUserConfirm = false">
      <div class="modal" style="width: min(400px, 90vw);">
        <div class="modal-body">
          <div class="confirm-dialog">
            <span class="material-icons-outlined">warning</span>
            <h4>Confirmă Ștergerea</h4>
            <p>Sigur doriți să ștergeți acest utilizator?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteUserConfirm = false">Anulează</button>
          <button class="btn btn-danger" @click="executeDeleteUser">
            <span class="material-icons-outlined">delete</span>
            Șterge
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteGroupConfirm" class="modal-overlay" @click.self="showDeleteGroupConfirm = false">
      <div class="modal" style="width: min(400px, 90vw);">
        <div class="modal-body">
          <div class="confirm-dialog">
            <span class="material-icons-outlined">warning</span>
            <h4>Confirmă Ștergerea</h4>
            <p>Sigur doriți să ștergeți acest grup?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteGroupConfirm = false">Anulează</button>
          <button class="btn btn-danger" @click="executeDeleteGroup">
            <span class="material-icons-outlined">delete</span>
            Șterge
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-tab {
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

.admin-tab:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.admin-tab.active {
  color: var(--text-accent);
  border-bottom-color: var(--text-accent);
}

.admin-tab .material-icons-outlined {
  font-size: 20px;
}

.group-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 18px;
  transition: border-color 0.2s;
}

.group-card:hover {
  border-color: var(--text-accent);
}

.module-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  font-size: 0.84rem;
  transition: all 0.2s;
  user-select: none;
}

.module-checkbox:hover {
  border-color: var(--text-accent);
}

.module-checkbox.checked {
  background: rgba(13, 148, 136, 0.1);
  border-color: rgba(13, 148, 136, 0.3);
  color: var(--text-accent);
}
</style>
