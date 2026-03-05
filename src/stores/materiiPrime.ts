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
        valoareStoc: Number(row.valoare_stoc || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useMateriiPrimeStore = defineStore('materiiPrime', () => {
    const items = ref<MateriePrima[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const valoareTotalaStoc = computed(() =>
        items.value.reduce((sum, item) => sum + item.valoareStoc, 0)
    )

    // Preț mediu unitar = valoare_stoc / stoc (sau 0 dacă stoc = 0)
    function getPretMediu(item: MateriePrima): number {
        if (item.stoc <= 0) return item.pret // fallback to last known price
        return item.valoareStoc / item.stoc
    }

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
        const valoareStoc = item.pret * item.stoc
        const { data, error } = await supabase
            .from('materii_prime')
            .insert({
                denumire: item.denumire,
                pret: item.pret,
                unitate_masura: item.unitateMasura,
                stoc: item.stoc,
                valoare_stoc: valoareStoc,
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
        if (data.valoareStoc !== undefined) updateData.valoare_stoc = data.valoareStoc

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

    // ============ Stock Management ============
    async function achizitie(id: string, cantitate: number, pretAchizitie: number, observatii: string = '') {
        const item = getById(id)
        if (!item) return
        const { useIstoricStocStore } = await import('./istoricStoc')
        const istoricStore = useIstoricStocStore()

        const stocAnterior = item.stoc
        const stocNou = stocAnterior + cantitate
        const valoareStocNoua = item.valoareStoc + (cantitate * pretAchizitie)
        const pretMediuNou = stocNou > 0 ? valoareStocNoua / stocNou : pretAchizitie

        // Update stock, valoare_stoc and pret (weighted avg) in DB
        await supabase.from('materii_prime').update({
            stoc: stocNou,
            valoare_stoc: valoareStocNoua,
            pret: pretMediuNou,
            updated_at: new Date().toISOString(),
        }).eq('id', id)

        // Log history entry with purchase price
        await istoricStore.addEntry({
            materiePrimaId: id,
            tipMiscare: 'achizitie',
            cantitate: cantitate,
            stocAnterior,
            stocNou,
            pretAchizitie,
            observatii,
        })

        // Update local state
        const index = items.value.findIndex(i => i.id === id)
        if (index !== -1) {
            items.value[index] = {
                ...items.value[index],
                stoc: stocNou,
                valoareStoc: valoareStocNoua,
                pret: pretMediuNou,
                updatedAt: new Date().toISOString(),
            }
        }
    }

    async function corectieStoc(id: string, cantitate: number, observatii: string = '') {
        const item = getById(id)
        if (!item) return
        const { useIstoricStocStore } = await import('./istoricStoc')
        const istoricStore = useIstoricStocStore()

        const stocAnterior = item.stoc
        const stocNou = stocAnterior + cantitate // cantitate can be positive or negative
        // Adjust valoare_stoc proportionally: using current average price
        const pretMediu = getPretMediu(item)
        const valoareStocNoua = stocNou > 0 ? stocNou * pretMediu : 0

        // Update stock in DB
        await supabase.from('materii_prime').update({
            stoc: stocNou,
            valoare_stoc: valoareStocNoua,
            updated_at: new Date().toISOString(),
        }).eq('id', id)

        // Log history entry
        await istoricStore.addEntry({
            materiePrimaId: id,
            tipMiscare: 'corectie',
            cantitate,
            stocAnterior,
            stocNou,
            observatii,
        })

        // Update local state
        const index = items.value.findIndex(i => i.id === id)
        if (index !== -1) {
            items.value[index] = {
                ...items.value[index],
                stoc: stocNou,
                valoareStoc: valoareStocNoua,
                updatedAt: new Date().toISOString(),
            }
        }
    }

    // Used by comenzi store to adjust stock programmatically
    async function adjustStock(id: string, cantitate: number, tipMiscare: 'comanda' | 'anulare_comanda', comandaId: string, numarComanda: string) {
        const item = getById(id)
        if (!item) return
        const { useIstoricStocStore } = await import('./istoricStoc')
        const istoricStore = useIstoricStocStore()

        const stocAnterior = item.stoc
        const stocNou = stocAnterior + cantitate
        // For orders: adjust valoare_stoc proportionally using avg price
        const pretMediu = getPretMediu(item)
        const valoareStocNoua = stocNou > 0 ? stocNou * pretMediu : 0

        await supabase.from('materii_prime').update({
            stoc: stocNou,
            valoare_stoc: valoareStocNoua,
            updated_at: new Date().toISOString(),
        }).eq('id', id)

        await istoricStore.addEntry({
            materiePrimaId: id,
            tipMiscare,
            cantitate,
            stocAnterior,
            stocNou,
            comandaId,
            numarComanda,
        })

        const index = items.value.findIndex(i => i.id === id)
        if (index !== -1) {
            items.value[index] = {
                ...items.value[index],
                stoc: stocNou,
                valoareStoc: valoareStocNoua,
                updatedAt: new Date().toISOString(),
            }
        }
    }

    return { items, loaded, totalItems, valoareTotalaStoc, getPretMediu, getById, fetchAll, add, update, remove, achizitie, corectieStoc, adjustStock }
})
