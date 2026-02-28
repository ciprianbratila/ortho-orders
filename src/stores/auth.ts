import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Utilizator, GrupUtilizatori, ModulAcces } from '../types'
import { supabase } from '../lib/supabase'

const STORAGE_SESSION = 'ortho-session'

function mapUser(row: any): Utilizator {
    return {
        id: row.id,
        username: row.username,
        parola: row.parola,
        nume: row.nume,
        prenume: row.prenume,
        email: row.email || '',
        grupId: row.grup_id,
        activ: row.activ,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapGroup(row: any): GrupUtilizatori {
    return {
        id: row.id,
        denumire: row.denumire,
        descriere: row.descriere || '',
        moduleAcces: (row.module_acces || []) as ModulAcces[],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useAuthStore = defineStore('auth', () => {
    const users = ref<Utilizator[]>([])
    const groups = ref<GrupUtilizatori[]>([])
    const loaded = ref(false)

    // Session from localStorage (stays local for session persistence)
    const savedSession = localStorage.getItem(STORAGE_SESSION)
    const currentUser = ref<Utilizator | null>(savedSession ? JSON.parse(savedSession) : null)

    const isLoggedIn = computed(() => !!currentUser.value)
    const isAdmin = computed(() => {
        if (!currentUser.value) return false
        const group = groups.value.find(g => g.id === currentUser.value!.grupId)
        return group?.moduleAcces.includes('admin') || false
    })

    const currentGroup = computed(() => {
        if (!currentUser.value) return null
        return groups.value.find(g => g.id === currentUser.value!.grupId) || null
    })

    const allowedModules = computed((): ModulAcces[] => {
        if (!currentGroup.value) return []
        return currentGroup.value.moduleAcces
    })

    async function fetchAll() {
        const [usersRes, groupsRes] = await Promise.all([
            supabase.from('utilizatori').select('*').order('username'),
            supabase.from('grupuri').select('*').order('denumire'),
        ])
        if (usersRes.error) console.error('Eroare utilizatori:', usersRes.error)
        if (groupsRes.error) console.error('Eroare grupuri:', groupsRes.error)

        users.value = (usersRes.data || []).map(mapUser)
        groups.value = (groupsRes.data || []).map(mapGroup)
        loaded.value = true

        // Refresh current user data from DB
        if (currentUser.value) {
            const freshUser = users.value.find(u => u.id === currentUser.value!.id)
            if (freshUser) {
                currentUser.value = freshUser
                localStorage.setItem(STORAGE_SESSION, JSON.stringify(freshUser))
            }
        }
    }

    // ====== Auth ======
    async function login(username: string, parola: string): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase
            .from('utilizatori')
            .select('*')
            .eq('username', username)
            .eq('parola', parola)
            .single()

        if (error || !data) {
            return { success: false, error: 'Utilizator sau parolă incorectă!' }
        }

        const user = mapUser(data)
        if (!user.activ) {
            return { success: false, error: 'Contul este dezactivat. Contactați administratorul.' }
        }

        currentUser.value = user
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(user))

        // Also fetch groups for permission checks
        if (groups.value.length === 0) {
            const { data: grpData } = await supabase.from('grupuri').select('*')
            groups.value = (grpData || []).map(mapGroup)
        }

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
    async function addUser(user: Omit<Utilizator, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('utilizatori')
            .insert({
                username: user.username,
                parola: user.parola,
                nume: user.nume,
                prenume: user.prenume,
                email: user.email,
                grup_id: user.grupId,
                activ: user.activ,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare user:', error); return null }
        const newUser = mapUser(data)
        users.value.push(newUser)
        return newUser
    }

    async function updateUser(id: string, data: Partial<Omit<Utilizator, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.username !== undefined) updateData.username = data.username
        if (data.parola !== undefined) updateData.parola = data.parola
        if (data.nume !== undefined) updateData.nume = data.nume
        if (data.prenume !== undefined) updateData.prenume = data.prenume
        if (data.email !== undefined) updateData.email = data.email
        if (data.grupId !== undefined) updateData.grup_id = data.grupId
        if (data.activ !== undefined) updateData.activ = data.activ

        const { error } = await supabase.from('utilizatori').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare user:', error); return }

        const index = users.value.findIndex(u => u.id === id)
        if (index !== -1) {
            users.value[index] = { ...users.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function removeUser(id: string) {
        const { error } = await supabase.from('utilizatori').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere user:', error); return }
        users.value = users.value.filter(u => u.id !== id)
    }

    // ====== Group CRUD ======
    async function addGroup(group: Omit<GrupUtilizatori, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('grupuri')
            .insert({
                denumire: group.denumire,
                descriere: group.descriere,
                module_acces: group.moduleAcces,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare grup:', error); return null }
        const newGroup = mapGroup(data)
        groups.value.push(newGroup)
        return newGroup
    }

    async function updateGroup(id: string, data: Partial<Omit<GrupUtilizatori, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.denumire !== undefined) updateData.denumire = data.denumire
        if (data.descriere !== undefined) updateData.descriere = data.descriere
        if (data.moduleAcces !== undefined) updateData.module_acces = data.moduleAcces

        const { error } = await supabase.from('grupuri').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare grup:', error); return }

        const index = groups.value.findIndex(g => g.id === id)
        if (index !== -1) {
            groups.value[index] = { ...groups.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function removeGroup(id: string) {
        const { error } = await supabase.from('grupuri').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere grup:', error); return }
        groups.value = groups.value.filter(g => g.id !== id)
    }

    function getGroupById(id: string): GrupUtilizatori | undefined {
        return groups.value.find(g => g.id === id)
    }

    function getUsersByGroup(groupId: string): Utilizator[] {
        return users.value.filter(u => u.grupId === groupId)
    }

    return {
        users, groups, loaded, currentUser, isLoggedIn, isAdmin,
        currentGroup, allowedModules,
        fetchAll, login, logout, hasAccess,
        addUser, updateUser, removeUser,
        addGroup, updateGroup, removeGroup,
        getGroupById, getUsersByGroup,
    }
})
