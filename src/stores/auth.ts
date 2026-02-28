import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Utilizator, GrupUtilizatori, ModulAcces } from '../types'

const STORAGE_USERS = 'ortho-utilizatori'
const STORAGE_GROUPS = 'ortho-grupuri'
const STORAGE_SESSION = 'ortho-session'

function loadUsers(): Utilizator[] {
    const data = localStorage.getItem(STORAGE_USERS)
    return data ? JSON.parse(data) : []
}

function loadGroups(): GrupUtilizatori[] {
    const data = localStorage.getItem(STORAGE_GROUPS)
    return data ? JSON.parse(data) : []
}

function saveUsers(items: Utilizator[]) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(items))
}

function saveGroups(items: GrupUtilizatori[]) {
    localStorage.setItem(STORAGE_GROUPS, JSON.stringify(items))
}

// ====== Seed Data ======
const ADMIN_GROUP_ID = 'grup-admin'
const MANAGEMENT_GROUP_ID = 'grup-management'
const PRODUCTIE_GROUP_ID = 'grup-productie'
const VANZARI_GROUP_ID = 'grup-vanzari'

const DEFAULT_GROUPS: GrupUtilizatori[] = [
    {
        id: ADMIN_GROUP_ID,
        denumire: 'Administratori',
        descriere: 'Acces complet la toate modulele aplicației, inclusiv administrare',
        moduleAcces: ['dashboard', 'comenzi', 'facturi', 'clienti', 'angajati', 'produse', 'materii-prime', 'admin'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: MANAGEMENT_GROUP_ID,
        denumire: 'Management',
        descriere: 'Acces la comenzi, facturi, clienți, angajați și rapoarte',
        moduleAcces: ['dashboard', 'comenzi', 'facturi', 'clienti', 'angajati'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: PRODUCTIE_GROUP_ID,
        denumire: 'Producție',
        descriere: 'Acces la produse, materii prime și comenzi',
        moduleAcces: ['dashboard', 'comenzi', 'produse', 'materii-prime'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: VANZARI_GROUP_ID,
        denumire: 'Vânzări',
        descriere: 'Acces la comenzi, facturi și clienți',
        moduleAcces: ['dashboard', 'comenzi', 'facturi', 'clienti'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
]

const DEFAULT_USERS: Utilizator[] = [
    {
        id: 'user-admin',
        username: 'admin',
        parola: '1234',
        nume: 'Administrator',
        prenume: 'System',
        email: 'admin@ortho.ro',
        grupId: ADMIN_GROUP_ID,
        activ: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: 'user-maria',
        username: 'maria.ionescu',
        parola: '1234',
        nume: 'Ionescu',
        prenume: 'Maria',
        email: 'maria.ionescu@ortho.ro',
        grupId: MANAGEMENT_GROUP_ID,
        activ: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: 'user-andrei',
        username: 'andrei.pop',
        parola: '1234',
        nume: 'Pop',
        prenume: 'Andrei',
        email: 'andrei.pop@ortho.ro',
        grupId: PRODUCTIE_GROUP_ID,
        activ: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
        id: 'user-elena',
        username: 'elena.vasile',
        parola: '1234',
        nume: 'Vasile',
        prenume: 'Elena',
        email: 'elena.vasile@ortho.ro',
        grupId: VANZARI_GROUP_ID,
        activ: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
    },
]

export const useAuthStore = defineStore('auth', () => {
    // Initialize with seed data if empty
    if (loadGroups().length === 0) {
        saveGroups(DEFAULT_GROUPS)
    }
    if (loadUsers().length === 0) {
        saveUsers(DEFAULT_USERS)
    }

    const users = ref<Utilizator[]>(loadUsers())
    const groups = ref<GrupUtilizatori[]>(loadGroups())

    // Session
    const savedSession = localStorage.getItem(STORAGE_SESSION)
    const currentUser = ref<Utilizator | null>(savedSession ? JSON.parse(savedSession) : null)

    const isLoggedIn = computed(() => !!currentUser.value)
    const isAdmin = computed(() => currentUser.value?.grupId === ADMIN_GROUP_ID)

    const currentGroup = computed(() => {
        if (!currentUser.value) return null
        return groups.value.find(g => g.id === currentUser.value!.grupId) || null
    })

    const allowedModules = computed((): ModulAcces[] => {
        if (!currentGroup.value) return []
        return currentGroup.value.moduleAcces
    })

    // ====== Auth ======
    function login(username: string, parola: string): { success: boolean; error?: string } {
        const user = users.value.find(u => u.username === username && u.parola === parola)
        if (!user) {
            return { success: false, error: 'Utilizator sau parolă incorectă!' }
        }
        if (!user.activ) {
            return { success: false, error: 'Contul este dezactivat. Contactați administratorul.' }
        }
        currentUser.value = user
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(user))
        return { success: true }
    }

    function logout() {
        currentUser.value = null
        localStorage.removeItem(STORAGE_SESSION)
    }

    function hasAccess(module: ModulAcces): boolean {
        return allowedModules.value.includes(module)
    }

    // ====== User CRUD ======
    function addUser(user: Omit<Utilizator, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newUser: Utilizator = {
            ...user,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        users.value.push(newUser)
        saveUsers(users.value)
        return newUser
    }

    function updateUser(id: string, data: Partial<Omit<Utilizator, 'id' | 'createdAt' | 'updatedAt'>>) {
        const index = users.value.findIndex(u => u.id === id)
        if (index !== -1) {
            users.value[index] = { ...users.value[index], ...data, updatedAt: new Date().toISOString() }
            saveUsers(users.value)
        }
    }

    function removeUser(id: string) {
        users.value = users.value.filter(u => u.id !== id)
        saveUsers(users.value)
    }

    // ====== Group CRUD ======
    function addGroup(group: Omit<GrupUtilizatori, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newGroup: GrupUtilizatori = {
            ...group,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        groups.value.push(newGroup)
        saveGroups(groups.value)
        return newGroup
    }

    function updateGroup(id: string, data: Partial<Omit<GrupUtilizatori, 'id' | 'createdAt' | 'updatedAt'>>) {
        const index = groups.value.findIndex(g => g.id === id)
        if (index !== -1) {
            groups.value[index] = { ...groups.value[index], ...data, updatedAt: new Date().toISOString() }
            saveGroups(groups.value)
        }
    }

    function removeGroup(id: string) {
        groups.value = groups.value.filter(g => g.id !== id)
        saveGroups(groups.value)
    }

    function getGroupById(id: string): GrupUtilizatori | undefined {
        return groups.value.find(g => g.id === id)
    }

    function getUsersByGroup(groupId: string): Utilizator[] {
        return users.value.filter(u => u.grupId === groupId)
    }

    return {
        users,
        groups,
        currentUser,
        isLoggedIn,
        isAdmin,
        currentGroup,
        allowedModules,
        login,
        logout,
        hasAccess,
        addUser,
        updateUser,
        removeUser,
        addGroup,
        updateGroup,
        removeGroup,
        getGroupById,
        getUsersByGroup,
    }
})
