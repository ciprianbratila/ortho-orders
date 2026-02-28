import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Client } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: any, docs?: any[]): Client {
    return {
        id: row.id,
        nume: row.nume,
        prenume: row.prenume,
        cnp: row.cnp || '',
        telefon: row.telefon || '',
        email: row.email || '',
        adresa: row.adresa || '',
        documente: (docs || row.documente_client || []).map((d: any) => ({
            id: d.id,
            tip: d.tip,
            denumire: d.denumire,
            numeDocument: d.nume_document,
            fisierBase64: d.fisier_base64,
            observatii: d.observatii || '',
            createdAt: d.created_at,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export const useClientiStore = defineStore('clienti', () => {
    const items = ref<Client[]>([])
    const loaded = ref(false)

    const totalItems = computed(() => items.value.length)

    async function fetchAll() {
        const { data, error } = await supabase
            .from('clienti')
            .select('*, documente_client(*)')
            .order('nume')
        if (error) { console.error('Eroare clienti:', error); return }
        items.value = (data || []).map(r => mapRow(r))
        loaded.value = true
    }

    function getById(id: string): Client | undefined {
        return items.value.find(item => item.id === id)
    }

    function getNumeComplet(client: Client): string {
        return `${client.nume} ${client.prenume}`
    }

    async function add(item: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
        const { data, error } = await supabase
            .from('clienti')
            .insert({
                nume: item.nume,
                prenume: item.prenume,
                cnp: item.cnp,
                telefon: item.telefon,
                email: item.email,
                adresa: item.adresa,
            })
            .select()
            .single()
        if (error) { console.error('Eroare adăugare client:', error); return null }

        // Insert documents if any
        if (item.documente && item.documente.length > 0) {
            const docs = item.documente.map(d => ({
                client_id: data.id,
                tip: d.tip,
                denumire: d.denumire,
                nume_document: d.numeDocument,
                fisier_base64: d.fisierBase64,
                observatii: d.observatii,
            }))
            await supabase.from('documente_client').insert(docs)
        }

        const newItem = mapRow(data, [])
        newItem.documente = item.documente || []
        items.value.push(newItem)
        return newItem
    }

    async function update(id: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.nume !== undefined) updateData.nume = data.nume
        if (data.prenume !== undefined) updateData.prenume = data.prenume
        if (data.cnp !== undefined) updateData.cnp = data.cnp
        if (data.telefon !== undefined) updateData.telefon = data.telefon
        if (data.email !== undefined) updateData.email = data.email
        if (data.adresa !== undefined) updateData.adresa = data.adresa

        const { error } = await supabase.from('clienti').update(updateData).eq('id', id)
        if (error) { console.error('Eroare actualizare client:', error); return }

        // Update documents if provided
        if (data.documente !== undefined) {
            // Delete existing docs and re-insert
            await supabase.from('documente_client').delete().eq('client_id', id)
            if (data.documente.length > 0) {
                const docs = data.documente.map(d => ({
                    client_id: id,
                    tip: d.tip,
                    denumire: d.denumire,
                    nume_document: d.numeDocument,
                    fisier_base64: d.fisierBase64,
                    observatii: d.observatii,
                }))
                await supabase.from('documente_client').insert(docs)
            }
        }

        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...data, updatedAt: new Date().toISOString() }
        }
    }

    async function remove(id: string) {
        const { error } = await supabase.from('clienti').delete().eq('id', id)
        if (error) { console.error('Eroare ștergere client:', error); return }
        items.value = items.value.filter(item => item.id !== id)
    }

    return { items, loaded, totalItems, getById, getNumeComplet, fetchAll, add, update, remove }
})
