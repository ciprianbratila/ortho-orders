import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Factura, StatusFactura } from '../types'

const STORAGE_KEY = 'ortho-facturi'

function loadFromStorage(): Factura[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: Factura[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useFacturiStore = defineStore('facturi', () => {
    const items = ref<Factura[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)

    const facturiEmise = computed(() => items.value.filter(f => f.status === 'emisa'))
    const facturiAchitate = computed(() => items.value.filter(f => f.status === 'achitata'))

    const totalVenituri = computed(() =>
        items.value.filter(f => f.status !== 'anulata').reduce((sum, f) => sum + f.totalFactura, 0)
    )

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

    function add(item: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newItem: Factura = {
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function updateStatus(id: string, status: StatusFactura) {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = {
                ...items.value[index],
                status,
                updatedAt: new Date().toISOString()
            }
            saveToStorage(items.value)
        }
    }

    function remove(id: string) {
        items.value = items.value.filter(item => item.id !== id)
        saveToStorage(items.value)
    }

    return {
        items,
        totalItems,
        facturiEmise,
        facturiAchitate,
        totalVenituri,
        getById,
        getByComandaId,
        generateNumarFactura,
        add,
        updateStatus,
        remove
    }
})
