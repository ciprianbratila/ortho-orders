import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Comanda, StatusComanda } from '../types'
import { useProduseStore } from './produse'

const STORAGE_KEY = 'ortho-comenzi'
const COUNTER_KEY = 'ortho-comenzi-counter'

function loadFromStorage(): Comanda[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: Comanda[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function getNextCounter(): number {
    const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0')
    const next = current + 1
    localStorage.setItem(COUNTER_KEY, next.toString())
    return next
}

function generateNumarComanda(): string {
    const now = new Date()
    const year = now.getFullYear()
    const counter = getNextCounter()
    return `CMD-${year}-${counter.toString().padStart(4, '0')}`
}

export const useComenziStore = defineStore('comenzi', () => {
    const items = ref<Comanda[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)

    const comenziActive = computed(() =>
        items.value.filter(c => c.status !== 'anulata' && c.status !== 'livrata')
    )

    const comenziNoi = computed(() =>
        items.value.filter(c => c.status === 'noua')
    )

    const comenziInLucru = computed(() =>
        items.value.filter(c => c.status === 'in_lucru')
    )

    const comenziFinalizate = computed(() =>
        items.value.filter(c => c.status === 'finalizata')
    )

    const comenziLivrate = computed(() =>
        items.value.filter(c => c.status === 'livrata')
    )

    const venitTotal = computed(() =>
        items.value
            .filter(c => c.status !== 'anulata')
            .reduce((sum, c) => sum + c.totalCalculat, 0)
    )

    const avansTotal = computed(() =>
        items.value
            .filter(c => c.status !== 'anulata')
            .reduce((sum, c) => sum + c.avans, 0)
    )

    const decizieCASTotal = computed(() =>
        items.value
            .filter(c => c.status !== 'anulata' && c.decizieCAS)
            .reduce((sum, c) => sum + (c.decizieCAS?.valoare || 0), 0)
    )

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

    function add(item: Omit<Comanda, 'id' | 'numarComanda' | 'totalCalculat' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const totalCalculat = calculeazaTotal({ produse: item.produse })
        const newItem: Comanda = {
            ...item,
            id: crypto.randomUUID(),
            numarComanda: generateNumarComanda(),
            metodaPlata: item.metodaPlata || 'cash',
            totalCalculat,
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function updateStatus(id: string, status: StatusComanda) {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index].status = status
            items.value[index].updatedAt = new Date().toISOString()
            if (status === 'livrata') {
                items.value[index].dataLivrareEfectiva = new Date().toISOString()
            }
            saveToStorage(items.value)
        }
    }

    function update(id: string, data: Partial<Omit<Comanda, 'id' | 'numarComanda' | 'createdAt' | 'updatedAt'>>) {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            const updatedComanda = {
                ...items.value[index],
                ...data,
                updatedAt: new Date().toISOString()
            }
            if (data.produse) {
                updatedComanda.totalCalculat = calculeazaTotal({ produse: data.produse })
            }
            items.value[index] = updatedComanda
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
        comenziActive,
        comenziNoi,
        comenziInLucru,
        comenziFinalizate,
        comenziLivrate,
        venitTotal,
        avansTotal,
        decizieCASTotal,
        getById,
        calculeazaTotal,
        add,
        updateStatus,
        update,
        remove
    }
})
