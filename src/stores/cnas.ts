import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProdusCNAS, SetariCNAS, ComandaCNAS, StatusComandaCNAS } from '../types'
import { supabase } from '../lib/supabase'

// ============ Helpers ============

function mapProdusCNAS(row: any): ProdusCNAS {
    return {
        id: row.id,
        denumire: row.denumire,
        cod: row.cod || '',
        descriere: row.descriere || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapComandaCNAS(row: any): ComandaCNAS {
    return {
        id: row.id,
        comandaId: row.comanda_id,
        comandaProdusId: row.comanda_produs_id,
        numarComandaCNAS: row.numar_comanda_cnas,
        produseCNAS: (row.comenzi_cnas_produse || []).map((p: any) => ({
            produsCNASId: p.produs_cnas_id,
            cantitate: Number(p.cantitate),
        })),
        status: row.status as StatusComandaCNAS,
        observatii: row.observatii || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

async function getNextCNASCounter(): Promise<number> {
    const { data, error } = await supabase.rpc('increment_counter', { counter_name: 'comenzi_cnas' })
    if (error) {
        const { data: row } = await supabase.from('counters').select('value').eq('name', 'comenzi_cnas').single()
        const next = (row?.value || 0) + 1
        await supabase.from('counters').update({ value: next }).eq('name', 'comenzi_cnas')
        return next
    }
    return data
}

// ============ Store ============

export const useCNASStore = defineStore('cnas', () => {
    // Nomenclator produse CNAS
    const produse = ref<ProdusCNAS[]>([])
    const produseLoaded = ref(false)

    // Setari CNAS
    const setari = ref<SetariCNAS | null>(null)

    // Comenzi CNAS
    const comenzi = ref<ComandaCNAS[]>([])
    const comenziLoaded = ref(false)

    // Computed
    const totalProduse = computed(() => produse.value.length)
    const totalComenzi = computed(() => comenzi.value.length)
    const comenziNoi = computed(() => comenzi.value.filter(c => c.status === 'noua'))
    const comenziTrimise = computed(() => comenzi.value.filter(c => c.status === 'trimisa'))
    const comenziAprobate = computed(() => comenzi.value.filter(c => c.status === 'aprobata'))
    const comenziRespinse = computed(() => comenzi.value.filter(c => c.status === 'respinsa'))
    const valoareDecontare = computed(() => setari.value?.valoareDecontare || 0)

    // ============ PRODUSE CNAS ============

    async function fetchProduse() {
        const { data, error } = await supabase
            .from('produse_cnas')
            .select('*')
            .order('denumire')
        if (error) { console.error('Eroare produse CNAS:', error); return }
        produse.value = (data || []).map(mapProdusCNAS)
        produseLoaded.value = true
    }

    function getProdusCNASById(id: string): ProdusCNAS | undefined {
        return produse.value.find(p => p.id === id)
    }

    async function addProdus(item: Omit<ProdusCNAS, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('produse_cnas')
            .insert({ denumire: item.denumire, cod: item.cod, descriere: item.descriere })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare produs CNAS:', error); return null }
        const newItem = mapProdusCNAS(data)
        produse.value.push(newItem)
        return newItem
    }

    async function updateProdus(id: string, item: Partial<Omit<ProdusCNAS, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (item.denumire !== undefined) updateData.denumire = item.denumire
        if (item.cod !== undefined) updateData.cod = item.cod
        if (item.descriere !== undefined) updateData.descriere = item.descriere

        const { error } = await supabase.from('produse_cnas').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare produs CNAS:', error); return }

        const idx = produse.value.findIndex(p => p.id === id)
        if (idx !== -1) {
            produse.value[idx] = { ...produse.value[idx], ...item, updatedAt: new Date().toISOString() }
        }
    }

    async function removeProdus(id: string) {
        const { error } = await supabase.from('produse_cnas').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere produs CNAS:', error); return }
        produse.value = produse.value.filter(p => p.id !== id)
    }

    // ============ SETARI CNAS ============

    async function fetchSetari() {
        const { data, error } = await supabase
            .from('setari_cnas')
            .select('*')
            .limit(1)
            .single()
        if (error) { console.error('Eroare setări CNAS:', error); return }
        if (data) {
            setari.value = {
                id: data.id,
                valoareDecontare: Number(data.valoare_decontare),
                updatedAt: data.updated_at,
            }
        }
    }

    async function updateSetari(valoareDecontare: number) {
        if (!setari.value) return
        const { error } = await supabase
            .from('setari_cnas')
            .update({ valoare_decontare: valoareDecontare, updated_at: new Date().toISOString() })
            .eq('id', setari.value.id)
        if (error) { console.error('Eroare actualizare setări CNAS:', error); return }
        setari.value.valoareDecontare = valoareDecontare
        setari.value.updatedAt = new Date().toISOString()
    }

    // ============ COMENZI CNAS ============

    async function fetchComenzi() {
        const { data, error } = await supabase
            .from('comenzi_cnas')
            .select('*, comenzi_cnas_produse(*)')
            .order('created_at', { ascending: false })
        if (error) { console.error('Eroare comenzi CNAS:', error); return }
        comenzi.value = (data || []).map(mapComandaCNAS)
        comenziLoaded.value = true
    }

    function getComandaCNASById(id: string): ComandaCNAS | undefined {
        return comenzi.value.find(c => c.id === id)
    }

    function getComenziByComandaId(comandaId: string): ComandaCNAS[] {
        return comenzi.value.filter(c => c.comandaId === comandaId)
    }

    function getComandaByProdusId(comandaProdusId: string): ComandaCNAS | undefined {
        return comenzi.value.find(c => c.comandaProdusId === comandaProdusId)
    }

    async function addComanda(item: {
        comandaId: string
        comandaProdusId: string
        produseCNAS: { produsCNASId: string; cantitate: number }[]
        observatii?: string
    }) {
        const counter = await getNextCNASCounter()
        const year = new Date().getFullYear()
        const numarComandaCNAS = `CNAS-${year}-${counter.toString().padStart(4, '0')}`

        const { data, error } = await supabase
            .from('comenzi_cnas')
            .insert({
                comanda_id: item.comandaId,
                comanda_produs_id: item.comandaProdusId,
                numar_comanda_cnas: numarComandaCNAS,
                status: 'noua',
                observatii: item.observatii || '',
            })
            .select()
            .single()
        if (error) { console.error('Eroare creare comandă CNAS:', error); return null }

        // Insert produse CNAS mapping
        if (item.produseCNAS.length > 0) {
            const prods = item.produseCNAS.map(p => ({
                comanda_cnas_id: data.id,
                produs_cnas_id: p.produsCNASId,
                cantitate: p.cantitate,
            }))
            await supabase.from('comenzi_cnas_produse').insert(prods)
        }

        const newItem: ComandaCNAS = {
            id: data.id,
            comandaId: item.comandaId,
            comandaProdusId: item.comandaProdusId,
            numarComandaCNAS,
            produseCNAS: item.produseCNAS,
            status: 'noua',
            observatii: item.observatii || '',
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
        comenzi.value.unshift(newItem)
        return newItem
    }

    async function updateStatusComanda(id: string, status: StatusComandaCNAS) {
        const { error } = await supabase
            .from('comenzi_cnas')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) { console.error('Eroare actualizare status comandă CNAS:', error); return }

        const idx = comenzi.value.findIndex(c => c.id === id)
        if (idx !== -1) {
            comenzi.value[idx] = { ...comenzi.value[idx], status, updatedAt: new Date().toISOString() }
        }
    }

    async function removeComanda(id: string) {
        const { error } = await supabase.from('comenzi_cnas').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere comandă CNAS:', error); return }
        comenzi.value = comenzi.value.filter(c => c.id !== id)
    }

    return {
        // Produse
        produse, produseLoaded, totalProduse,
        fetchProduse, getProdusCNASById, addProdus, updateProdus, removeProdus,
        // Setari
        setari, valoareDecontare,
        fetchSetari, updateSetari,
        // Comenzi
        comenzi, comenziLoaded, totalComenzi,
        comenziNoi, comenziTrimise, comenziAprobate, comenziRespinse,
        fetchComenzi, getComandaCNASById, getComenziByComandaId, getComandaByProdusId,
        addComanda, updateStatusComanda, removeComanda,
    }
})
