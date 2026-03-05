import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IstoricStoc, TipMiscareStoc } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: any): IstoricStoc {
    return {
        id: row.id,
        materiePrimaId: row.materie_prima_id,
        tipMiscare: row.tip_miscare as TipMiscareStoc,
        cantitate: Number(row.cantitate),
        stocAnterior: Number(row.stoc_anterior),
        stocNou: Number(row.stoc_nou),
        pretAchizitie: row.pret_achizitie != null ? Number(row.pret_achizitie) : undefined,
        comandaId: row.comanda_id || undefined,
        numarComanda: row.numar_comanda || undefined,
        observatii: row.observatii || '',
        createdAt: row.created_at,
    }
}

export const useIstoricStocStore = defineStore('istoricStoc', () => {
    // Cache by materie_prima_id
    const cache = ref<Record<string, IstoricStoc[]>>({})

    async function fetchByMaterie(materiePrimaId: string): Promise<IstoricStoc[]> {
        const { data, error } = await supabase
            .from('istoric_stoc')
            .select('*')
            .eq('materie_prima_id', materiePrimaId)
            .order('created_at', { ascending: false })
        if (error) { console.error('Eroare istoric_stoc:', error); return [] }
        const items = (data || []).map(mapRow)
        cache.value[materiePrimaId] = items
        return items
    }

    async function addEntry(entry: {
        materiePrimaId: string
        tipMiscare: TipMiscareStoc
        cantitate: number
        stocAnterior: number
        stocNou: number
        pretAchizitie?: number
        comandaId?: string
        numarComanda?: string
        observatii?: string
    }): Promise<IstoricStoc | null> {
        const { data, error } = await supabase
            .from('istoric_stoc')
            .insert({
                materie_prima_id: entry.materiePrimaId,
                tip_miscare: entry.tipMiscare,
                cantitate: entry.cantitate,
                stoc_anterior: entry.stocAnterior,
                stoc_nou: entry.stocNou,
                pret_achizitie: entry.pretAchizitie || null,
                comanda_id: entry.comandaId || null,
                numar_comanda: entry.numarComanda || null,
                observatii: entry.observatii || '',
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare istoric:', error); return null }
        const newEntry = mapRow(data)

        // Update cache
        if (cache.value[entry.materiePrimaId]) {
            cache.value[entry.materiePrimaId].unshift(newEntry)
        }
        return newEntry
    }

    function getCached(materiePrimaId: string): IstoricStoc[] {
        return cache.value[materiePrimaId] || []
    }

    return { cache, fetchByMaterie, addEntry, getCached }
})
