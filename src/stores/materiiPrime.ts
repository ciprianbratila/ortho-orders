import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MateriePrima } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: any): MateriePrima {
    return {
        id: row.id,
        denumire: row.denumire,
        pret: Number(row.pret),
        unitateMasura: row.unitate_masura,
        stoc: Number(row.stoc),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useMateriiPrimeStore = defineStore('materiiPrime', () => {
    const items = ref<MateriePrima[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const valoareTotalaStoc = computed(() =>
        items.value.reduce((sum, item) => sum + item.pret * item.stoc, 0)
    )

    async function fetchAll() {
        const { data, error } = await supabase
            .from('materii_prime')
            .select('*')
            .order('denumire')
        if (error) { console.error('Eroare materii_prime:', error); return }
        items.value = (data || []).map(mapRow)
        loaded.value = true
    }

    function getById(id: string): MateriePrima | undefined {
        return items.value.find(item => item.id === id)
    }

    async function add(item: Omit<MateriePrima, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('materii_prime')
            .insert({
                denumire: item.denumire,
                pret: item.pret,
                unitate_masura: item.unitateMasura,
                stoc: item.stoc,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare:', error); return null }
        const newItem = mapRow(data)
        items.value.push(newItem)
        return newItem
    }

    async function update(id: string, data: Partial<Omit<MateriePrima, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.denumire !== undefined) updateData.denumire = data.denumire
        if (data.pret !== undefined) updateData.pret = data.pret
        if (data.unitateMasura !== undefined) updateData.unitate_masura = data.unitateMasura
        if (data.stoc !== undefined) updateData.stoc = data.stoc

        const { error } = await supabase.from('materii_prime').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare:', error); return }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('materii_prime').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return { items, loaded, totalItems, valoareTotalaStoc, getById, fetchAll, add, update, remove }
})
