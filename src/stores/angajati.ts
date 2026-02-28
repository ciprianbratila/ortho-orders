import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Angajat } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: any): Angajat {
    return {
        id: row.id,
        nume: row.nume,
        prenume: row.prenume,
        functie: row.functie,
        telefon: row.telefon || '',
        email: row.email || '',
        activ: row.activ,
        utilizatorId: row.utilizator_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useAngajatiStore = defineStore('angajati', () => {
    const items = ref<Angajat[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const angajatiActivi = computed(() => items.value.filter(a => a.activ))

    async function fetchAll() {
        const { data, error } = await supabase
            .from('angajati')
            .select('*')
            .order('nume')
        if (error) { console.error('Eroare angajati:', error); return }
        items.value = (data || []).map(mapRow)
        loaded.value = true
    }

    function getById(id: string): Angajat | undefined {
        return items.value.find(item => item.id === id)
    }

    function getByUserId(userId: string): Angajat | undefined {
        return items.value.find(item => item.utilizatorId === userId)
    }

    async function add(item: Omit<Angajat, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('angajati')
            .insert({
                nume: item.nume,
                prenume: item.prenume,
                functie: item.functie,
                telefon: item.telefon,
                email: item.email,
                activ: item.activ,
                utilizator_id: item.utilizatorId || null,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare angajat:', error); return null }
        const newItem = mapRow(data)
        items.value.push(newItem)
        return newItem
    }

    async function update(id: string, data: Partial<Omit<Angajat, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.nume !== undefined) updateData.nume = data.nume
        if (data.prenume !== undefined) updateData.prenume = data.prenume
        if (data.functie !== undefined) updateData.functie = data.functie
        if (data.telefon !== undefined) updateData.telefon = data.telefon
        if (data.email !== undefined) updateData.email = data.email
        if (data.activ !== undefined) updateData.activ = data.activ
        if (data.utilizatorId !== undefined) updateData.utilizator_id = data.utilizatorId || null

        const { error } = await supabase.from('angajati').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare angajat:', error); return }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('angajati').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere angajat:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return { items, loaded, totalItems, angajatiActivi, getById, getByUserId, fetchAll, add, update, remove }
})
