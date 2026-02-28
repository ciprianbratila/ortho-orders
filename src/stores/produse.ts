import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Produs, ComponentaProdus, TipProdus } from '../types'
import { useMateriiPrimeStore } from './materiiPrime'
import { supabase } from '../lib/supabase'

function mapRow(row: any): Produs {
    return {
        id: row.id,
        tip: (row.tip || 'produs') as TipProdus,
        denumire: row.denumire,
        descriere: row.descriere || '',
        produsParinteId: row.produs_parinte_id || undefined,
        componente: (row.produse_componente || []).map((c: any) => ({
            materiePrimaId: c.materie_prima_id,
            cantitate: Number(c.cantitate),
        })),
        pretManopera: Number(row.pret_manopera),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useProduseStore = defineStore('produse', () => {
    const items = ref<Produs[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const produse = computed(() => items.value.filter(i => i.tip === 'produs'))
    const servicii = computed(() => items.value.filter(i => i.tip === 'serviciu'))

    async function fetchAll() {
        const { data, error } = await supabase
            .from('produse')
            .select('*, produse_componente(*)')
            .order('denumire')
        if (error) { console.error('Eroare produse:', error); return }
        items.value = (data || []).map(mapRow)
        loaded.value = true
    }

    function getById(id: string): Produs | undefined {
        return items.value.find(item => item.id === id)
    }

    function getToateComponentele(produs: Produs): ComponentaProdus[] {
        const componente: ComponentaProdus[] = [...produs.componente]
        if (produs.produsParinteId) {
            const parinte = getById(produs.produsParinteId)
            if (parinte) {
                const parentComps = getToateComponentele(parinte)
                for (const pc of parentComps) {
                    const existing = componente.find(c => c.materiePrimaId === pc.materiePrimaId)
                    if (existing) {
                        existing.cantitate += pc.cantitate
                    } else {
                        componente.push({ ...pc })
                    }
                }
            }
        }
        return componente
    }

    function calculeazaPretProdus(produs: Produs): number {
        const materiiStore = useMateriiPrimeStore()
        const toateComp = getToateComponentele(produs)
        let pretComponente = 0
        for (const comp of toateComp) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                pretComponente += materie.pret * comp.cantitate
            }
        }
        let pretManopera = produs.pretManopera
        if (produs.produsParinteId) {
            const parinte = getById(produs.produsParinteId)
            if (parinte) {
                pretManopera += calculeazaManoperaTotala(parinte)
            }
        }
        return pretComponente + pretManopera
    }

    function calculeazaManoperaTotala(produs: Produs): number {
        let total = produs.pretManopera
        if (produs.produsParinteId) {
            const parinte = getById(produs.produsParinteId)
            if (parinte) {
                total += calculeazaManoperaTotala(parinte)
            }
        }
        return total
    }

    function calculeazaPretComponenteProprii(componente: ComponentaProdus[]): number {
        const materiiStore = useMateriiPrimeStore()
        let total = 0
        for (const comp of componente) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                total += materie.pret * comp.cantitate
            }
        }
        return total
    }

    function verificaDuplicat(componente: ComponentaProdus[], produsParinteId?: string, excludeId?: string): string | null {
        const sorted = normalizareComponente(componente, produsParinteId)
        for (const produs of items.value) {
            if (excludeId && produs.id === excludeId) continue
            const existente = normalizareComponente(produs.componente, produs.produsParinteId)
            if (sorted.length !== existente.length) continue
            const match = sorted.every((c, i) =>
                c.materiePrimaId === existente[i].materiePrimaId &&
                Math.abs(c.cantitate - existente[i].cantitate) < 0.001
            )
            if (match) return produs.denumire
        }
        return null
    }

    function normalizareComponente(componente: ComponentaProdus[], produsParinteId?: string): ComponentaProdus[] {
        const all: ComponentaProdus[] = [...componente.map(c => ({ ...c }))]
        if (produsParinteId) {
            const parinte = getById(produsParinteId)
            if (parinte) {
                const parentComps = getToateComponentele(parinte)
                for (const pc of parentComps) {
                    const existing = all.find(c => c.materiePrimaId === pc.materiePrimaId)
                    if (existing) {
                        existing.cantitate += pc.cantitate
                    } else {
                        all.push({ ...pc })
                    }
                }
            }
        }
        const merged: Map<string, number> = new Map()
        for (const c of all) {
            merged.set(c.materiePrimaId, (merged.get(c.materiePrimaId) || 0) + c.cantitate)
        }
        return Array.from(merged.entries())
            .map(([materiePrimaId, cantitate]) => ({ materiePrimaId, cantitate }))
            .sort((a, b) => a.materiePrimaId.localeCompare(b.materiePrimaId))
    }

    function getProduseDerivate(produsId: string): Produs[] {
        return items.value.filter(p => p.produsParinteId === produsId)
    }

    async function add(item: Omit<Produs, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('produse')
            .insert({
                tip: item.tip || 'produs',
                denumire: item.denumire,
                descriere: item.descriere,
                produs_parinte_id: item.tip === 'serviciu' ? null : (item.produsParinteId || null),
                pret_manopera: item.pretManopera,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare produs:', error); return null }

        // Insert components
        if (item.componente.length > 0) {
            const comps = item.componente.map(c => ({
                produs_id: data.id,
                materie_prima_id: c.materiePrimaId,
                cantitate: c.cantitate,
            }))
            await supabase.from('produse_componente').insert(comps)
        }

        const newItem: Produs = {
            ...item,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
        items.value.push(newItem)
        return newItem
    }

    async function update(id: string, data: Partial<Omit<Produs, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.denumire !== undefined) updateData.denumire = data.denumire
        if (data.descriere !== undefined) updateData.descriere = data.descriere
        if (data.produsParinteId !== undefined) updateData.produs_parinte_id = data.produsParinteId || null
        if (data.pretManopera !== undefined) updateData.pret_manopera = data.pretManopera

        const { error } = await supabase.from('produse').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare produs:', error); return }

        // Update components if provided
        if (data.componente !== undefined) {
            await supabase.from('produse_componente').delete().eq('produs_id', id)
            if (data.componente.length > 0) {
                const comps = data.componente.map(c => ({
                    produs_id: id,
                    materie_prima_id: c.materiePrimaId,
                    cantitate: c.cantitate,
                }))
                await supabase.from('produse_componente').insert(comps)
            }
        }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('produse').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere produs:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return {
        items,
        loaded,
        totalItems,
        produse,
        servicii,
        getById,
        getToateComponentele,
        calculeazaPretProdus,
        calculeazaPretComponenteProprii,
        calculeazaManoperaTotala,
        verificaDuplicat,
        getProduseDerivate,
        fetchAll,
        add,
        update,
        remove
    }
})
