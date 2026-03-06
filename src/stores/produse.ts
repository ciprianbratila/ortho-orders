import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Produs, ComponentaProdus, TipProdus, TipAdaos } from '../types'
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
        adaosComercial: Number(row.adaos_comercial || 0),
        tipAdaos: (row.tip_adaos || 'valoric') as TipAdaos,
        pretFinal: Number(row.pret_final || 0),
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

        // Auto-initialize pretFinal for existing products that don't have it set
        await initializePretFinal()
    }

    async function initializePretFinal() {
        const toInit = items.value.filter(p => p.pretFinal <= 0)
        if (toInit.length === 0) return
        console.log(`Inițializez pretFinal pentru ${toInit.length} produse...`)
        for (const produs of toInit) {
            const pretCalculat = calculeazaPretDinamic(produs)
            produs.pretFinal = pretCalculat
            await supabase.from('produse').update({
                pret_final: pretCalculat,
                updated_at: new Date().toISOString(),
            }).eq('id', produs.id)
        }
        console.log('pretFinal inițializat cu succes!')
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

    // ============ Adaos Comercial ============
    function calculeazaAdaos(produs: Produs, costBaza: number): number {
        if (produs.adaosComercial <= 0) return 0
        if (produs.tipAdaos === 'procentual') {
            return costBaza * (produs.adaosComercial / 100)
        }
        return produs.adaosComercial
    }

    // Same logic but with raw form values (for preview in modal)
    function calculeazaAdaosRaw(adaosComercial: number, tipAdaos: string, costBaza: number): number {
        if (adaosComercial <= 0) return 0
        if (tipAdaos === 'procentual') {
            return costBaza * (adaosComercial / 100)
        }
        return adaosComercial
    }

    // ============ Dynamic price calculation (used during editing) ============
    function calculeazaPretDinamic(produs: Produs): number {
        const materiiStore = useMateriiPrimeStore()
        const toateComp = getToateComponentele(produs)
        let pretComponente = 0
        for (const comp of toateComp) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                pretComponente += materiiStore.getPretMediu(materie) * comp.cantitate
            }
        }
        let pretManopera = produs.pretManopera
        if (produs.produsParinteId) {
            const parinte = getById(produs.produsParinteId)
            if (parinte) {
                pretManopera += calculeazaManoperaTotala(parinte)
            }
        }
        const costBaza = pretComponente + pretManopera
        return costBaza + calculeazaAdaos(produs, costBaza)
    }

    // ============ Frozen price (used for display and orders) ============
    // Returns pretFinal if set, otherwise falls back to dynamic calculation
    function getPretProdus(produs: Produs): number {
        if (produs.pretFinal > 0) return produs.pretFinal
        // Fallback for old products without pretFinal
        return calculeazaPretDinamic(produs)
    }

    // ============ Cost curent materii prime (dynamic, for margin calc) ============
    function calculeazaCostCurentMateriale(produs: Produs): number {
        const materiiStore = useMateriiPrimeStore()
        const toateComp = getToateComponentele(produs)
        let total = 0
        for (const comp of toateComp) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                total += materiiStore.getPretMediu(materie) * comp.cantitate
            }
        }
        return total
    }

    // ============ Marja profit ============
    function calculeazaMarjaProfit(produs: Produs): number {
        const pretFinal = getPretProdus(produs)
        const costMateriale = calculeazaCostCurentMateriale(produs)
        return pretFinal - costMateriale
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
                total += materiiStore.getPretMediu(materie) * comp.cantitate
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
        // Calculate pretFinal at save time
        const tempProdus = { ...item, id: '', createdAt: '', updatedAt: '' } as Produs
        const pretFinal = item.pretFinal > 0 ? item.pretFinal : calculeazaPretDinamic(tempProdus)

        const { data, error } = await supabase
            .from('produse')
            .insert({
                tip: item.tip || 'produs',
                denumire: item.denumire,
                descriere: item.descriere,
                produs_parinte_id: item.tip === 'serviciu' ? null : (item.produsParinteId || null),
                pret_manopera: item.pretManopera,
                adaos_comercial: item.adaosComercial || 0,
                tip_adaos: item.tipAdaos || 'valoric',
                pret_final: pretFinal,
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
            pretFinal,
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
        if (data.adaosComercial !== undefined) updateData.adaos_comercial = data.adaosComercial
        if (data.tipAdaos !== undefined) updateData.tip_adaos = data.tipAdaos
        if (data.pretFinal !== undefined) updateData.pret_final = data.pretFinal

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

    // ============ Recalculare preț ============
    async function recalculeazaPret(id: string): Promise<number> {
        const produs = getById(id)
        if (!produs) return 0
        const pretNou = calculeazaPretDinamic(produs)
        await supabase.from('produse').update({
            pret_final: pretNou,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        const index = items.value.findIndex(i => i.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], pretFinal: pretNou, updatedAt: new Date().toISOString() }
        }
        return pretNou
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
        calculeazaPretDinamic,
        getPretProdus,
        calculeazaCostCurentMateriale,
        calculeazaMarjaProfit,
        calculeazaAdaos,
        calculeazaAdaosRaw,
        calculeazaPretComponenteProprii,
        calculeazaManoperaTotala,
        verificaDuplicat,
        getProduseDerivate,
        fetchAll,
        add,
        update,
        recalculeazaPret,
        remove
    }
})
