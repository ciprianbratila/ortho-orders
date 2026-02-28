import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Comanda, StatusComanda, DecizieCAS } from '../types'
import { useProduseStore } from './produse'
import { supabase } from '../lib/supabase'

function mapRow(row: any): Comanda {
    const decizieCAS: DecizieCAS | undefined =
        row.decizie_cas_numar_document
            ? {
                numarDocument: row.decizie_cas_numar_document,
                dataDocument: row.decizie_cas_data_document || '',
                valoare: Number(row.decizie_cas_valoare) || 0,
                numeDocument: row.decizie_cas_nume_document,
                fisierBase64: row.decizie_cas_fisier_base64,
            }
            : undefined

    return {
        id: row.id,
        numarComanda: row.numar_comanda,
        clientId: row.client_id,
        tehnicianId: row.tehnician_id || undefined,
        produse: (row.comenzi_produse || []).map((p: any) => ({
            produsId: p.produs_id,
            cantitate: Number(p.cantitate),
            observatii: p.observatii || '',
        })),
        status: row.status as StatusComanda,
        metodaPlata: row.metoda_plata,
        dataComanda: row.data_comanda,
        dataLivrareEstimata: row.data_livrare_estimata,
        dataLivrareEfectiva: row.data_livrare_efectiva || undefined,
        avans: Number(row.avans),
        decizieCAS,
        totalCalculat: Number(row.total_calculat),
        observatii: row.observatii || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

async function getNextCounter(): Promise<number> {
    const { data, error } = await supabase.rpc('increment_counter', { counter_name: 'comenzi' })
    if (error) {
        // Fallback: read and update manually
        const { data: row } = await supabase.from('counters').select('value').eq('name', 'comenzi').single()
        const next = (row?.value || 0) + 1
        await supabase.from('counters').update({ value: next }).eq('name', 'comenzi')
        return next
    }
    return data
}

export const useComenziStore = defineStore('comenzi', () => {
    const items = ref<Comanda[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const comenziActive = computed(() => items.value.filter(c => c.status !== 'anulata' && c.status !== 'livrata'))
    const comenziNoi = computed(() => items.value.filter(c => c.status === 'noua'))
    const comenziInLucru = computed(() => items.value.filter(c => c.status === 'in_lucru'))
    const comenziFinalizate = computed(() => items.value.filter(c => c.status === 'finalizata'))
    const comenziLivrate = computed(() => items.value.filter(c => c.status === 'livrata'))

    const venitTotal = computed(() =>
        items.value.filter(c => c.status !== 'anulata').reduce((sum, c) => sum + c.totalCalculat, 0)
    )
    const avansTotal = computed(() =>
        items.value.filter(c => c.status !== 'anulata').reduce((sum, c) => sum + c.avans, 0)
    )
    const decizieCASTotal = computed(() =>
        items.value.filter(c => c.status !== 'anulata' && c.decizieCAS).reduce((sum, c) => sum + (c.decizieCAS?.valoare || 0), 0)
    )

    async function fetchAll() {
        const { data, error } = await supabase
            .from('comenzi')
            .select('*, comenzi_produse(*)')
            .order('created_at', { ascending: false })
        if (error) { console.error('Eroare comenzi:', error); return }
        items.value = (data || []).map(mapRow)
        loaded.value = true
    }

    function getById(id: string): Comanda | undefined {
        return items.value.find(item => item.id === id)
    }

    function calculeazaTotal(comanda: Pick<Comanda, 'produse'>): number {
        const produseStore = useProduseStore()
        let total = 0
        for (const pc of comanda.produse) {
            const produs = produseStore.getById(pc.produsId)
            if (produs) {
                total += produseStore.calculeazaPretProdus(produs) * pc.cantitate
            }
        }
        return total
    }

    async function add(item: Omit<Comanda, 'id' | 'numarComanda' | 'totalCalculat' | 'createdAt' | 'updatedAt'>) {
        const totalCalculat = calculeazaTotal({ produse: item.produse })
        const counter = await getNextCounter()
        const year = new Date().getFullYear()
        const numarComanda = `CMD-${year}-${counter.toString().padStart(4, '0')}`

        const insertData: any = {
            numar_comanda: numarComanda,
            client_id: item.clientId,
            tehnician_id: item.tehnicianId || null,
            status: item.status,
            metoda_plata: item.metodaPlata || 'cash',
            data_comanda: item.dataComanda,
            data_livrare_estimata: item.dataLivrareEstimata,
            avans: item.avans,
            total_calculat: totalCalculat,
            observatii: item.observatii,
        }

        if (item.decizieCAS) {
            insertData.decizie_cas_numar_document = item.decizieCAS.numarDocument
            insertData.decizie_cas_data_document = item.decizieCAS.dataDocument
            insertData.decizie_cas_valoare = item.decizieCAS.valoare
            insertData.decizie_cas_nume_document = item.decizieCAS.numeDocument
            insertData.decizie_cas_fisier_base64 = item.decizieCAS.fisierBase64
        }

        const { data, error } = await supabase.from('comenzi').insert(insertData).select().single()
        if (error) { console.error('Eroare adăugare comandă:', error); return null }

        // Insert products
        if (item.produse.length > 0) {
            const prods = item.produse.map(p => ({
                comanda_id: data.id,
                produs_id: p.produsId,
                cantitate: p.cantitate,
                observatii: p.observatii,
            }))
            await supabase.from('comenzi_produse').insert(prods)
        }

        const newItem: Comanda = {
            ...item,
            id: data.id,
            numarComanda,
            totalCalculat,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
        items.value.unshift(newItem)
        return newItem
    }

    async function updateStatus(id: string, status: StatusComanda) {
        const updateData: any = { status, updated_at: new Date().toISOString() }
        if (status === 'livrata') {
            updateData.data_livrare_efectiva = new Date().toISOString()
        }
        const { error } = await supabase.from('comenzi').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare status:', error); return }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index].status = status
            items.value[index].updatedAt = new Date().toISOString()
            if (status === 'livrata') {
                items.value[index].dataLivrareEfectiva = new Date().toISOString()
            }
        }
    }

    async function update(id: string, data: Partial<Omit<Comanda, 'id' | 'numarComanda' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.clientId !== undefined) updateData.client_id = data.clientId
        if (data.tehnicianId !== undefined) updateData.tehnician_id = data.tehnicianId || null
        if (data.status !== undefined) updateData.status = data.status
        if (data.metodaPlata !== undefined) updateData.metoda_plata = data.metodaPlata
        if (data.dataComanda !== undefined) updateData.data_comanda = data.dataComanda
        if (data.dataLivrareEstimata !== undefined) updateData.data_livrare_estimata = data.dataLivrareEstimata
        if (data.avans !== undefined) updateData.avans = data.avans
        if (data.observatii !== undefined) updateData.observatii = data.observatii
        if (data.decizieCAS !== undefined) {
            updateData.decizie_cas_numar_document = data.decizieCAS?.numarDocument || null
            updateData.decizie_cas_data_document = data.decizieCAS?.dataDocument || null
            updateData.decizie_cas_valoare = data.decizieCAS?.valoare || 0
            updateData.decizie_cas_nume_document = data.decizieCAS?.numeDocument || null
            updateData.decizie_cas_fisier_base64 = data.decizieCAS?.fisierBase64 || null
        }

        if (data.produse) {
            updateData.total_calculat = calculeazaTotal({ produse: data.produse })
            // Re-insert products
            await supabase.from('comenzi_produse').delete().eq('comanda_id', id)
            if (data.produse.length > 0) {
                const prods = data.produse.map(p => ({
                    comanda_id: id,
                    produs_id: p.produsId,
                    cantitate: p.cantitate,
                    observatii: p.observatii,
                }))
                await supabase.from('comenzi_produse').insert(prods)
            }
        }

        const { error } = await supabase.from('comenzi').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare comandă:', error); return }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            const updatedComanda = { ...items.value[index], ...data, updatedAt: new Date().toISOString() }
            if (data.produse) {
                updatedComanda.totalCalculat = updateData.total_calculat
            }
            items.value[index] = updatedComanda
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('comenzi').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere comandă:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return {
        items, loaded, totalItems, comenziActive, comenziNoi, comenziInLucru,
        comenziFinalizate, comenziLivrate, venitTotal, avansTotal, decizieCASTotal,
        getById, calculeazaTotal, fetchAll, add, updateStatus, update, remove
    }
})
