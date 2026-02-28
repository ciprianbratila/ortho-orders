import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Factura, StatusFactura } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: any): Factura {
    return {
        id: row.id,
        numarFactura: row.numar_factura,
        comandaId: row.comanda_id,
        numarComanda: row.numar_comanda,
        dateClient: {
            nume: row.client_nume,
            prenume: row.client_prenume,
            cnp: row.client_cnp || '',
            telefon: row.client_telefon || '',
            email: row.client_email || '',
            adresa: row.client_adresa || '',
        },
        linii: (row.facturi_linii || []).map((l: any) => ({
            denumire: l.denumire,
            cantitate: Number(l.cantitate),
            pretUnitar: Number(l.pret_unitar),
            total: Number(l.total),
        })),
        subtotal: Number(row.subtotal),
        tva: Number(row.tva),
        totalTVA: Number(row.total_tva),
        totalFactura: Number(row.total_factura),
        metodaPlata: row.metoda_plata,
        avans: Number(row.avans),
        decizieCASValoare: Number(row.decizie_cas_valoare),
        restPlata: Number(row.rest_plata),
        dataEmitere: row.data_emitere,
        dataScadenta: row.data_scadenta,
        status: row.status as StatusFactura,
        observatii: row.observatii || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useFacturiStore = defineStore('facturi', () => {
    const items = ref<Factura[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)
    const facturiEmise = computed(() => items.value.filter(f => f.status === 'emisa'))
    const facturiAchitate = computed(() => items.value.filter(f => f.status === 'achitata'))
    const totalVenituri = computed(() =>
        items.value.filter(f => f.status !== 'anulata').reduce((sum, f) => sum + f.totalFactura, 0)
    )

    async function fetchAll() {
        const { data, error } = await supabase
            .from('facturi')
            .select('*, facturi_linii(*)')
            .order('created_at', { ascending: false })
        if (error) { console.error('Eroare facturi:', error); return }
        items.value = (data || []).map(mapRow)
        loaded.value = true
    }

    function getById(id: string): Factura | undefined {
        return items.value.find(item => item.id === id)
    }

    function getByComandaId(comandaId: string): Factura | undefined {
        return items.value.find(item => item.comandaId === comandaId && item.status !== 'anulata')
    }

    function generateNumarFactura(): string {
        const year = new Date().getFullYear()
        const existing = items.value.filter(f => f.numarFactura.startsWith(`FACT-${year}`))
        const nextNum = existing.length + 1
        return `FACT-${year}-${String(nextNum).padStart(4, '0')}`
    }

    async function add(item: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('facturi')
            .insert({
                numar_factura: item.numarFactura,
                comanda_id: item.comandaId,
                numar_comanda: item.numarComanda,
                client_nume: item.dateClient.nume,
                client_prenume: item.dateClient.prenume,
                client_cnp: item.dateClient.cnp,
                client_telefon: item.dateClient.telefon,
                client_email: item.dateClient.email,
                client_adresa: item.dateClient.adresa,
                subtotal: item.subtotal,
                tva: item.tva,
                total_tva: item.totalTVA,
                total_factura: item.totalFactura,
                metoda_plata: item.metodaPlata,
                avans: item.avans,
                decizie_cas_valoare: item.decizieCASValoare,
                rest_plata: item.restPlata,
                data_emitere: item.dataEmitere,
                data_scadenta: item.dataScadenta,
                status: item.status,
                observatii: item.observatii,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare factură:', error); return null }

        // Insert line items
        if (item.linii.length > 0) {
            const linii = item.linii.map(l => ({
                factura_id: data.id,
                denumire: l.denumire,
                cantitate: l.cantitate,
                pret_unitar: l.pretUnitar,
                total: l.total,
            }))
            await supabase.from('facturi_linii').insert(linii)
        }

        const newItem: Factura = {
            ...item,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
        items.value.unshift(newItem)
        return newItem
    }

    async function updateStatus(id: string, status: StatusFactura) {
        const { error } = await supabase
            .from('facturi')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) { console.error('Eroare actualizare status factură:', error); return }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], status, updatedAt: new Date().toISOString() }
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('facturi').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere factură:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return {
        items, loaded, totalItems, facturiEmise, facturiAchitate, totalVenituri,
        getById, getByComandaId, generateNumarFactura, fetchAll, add, updateStatus, remove
    }
})
