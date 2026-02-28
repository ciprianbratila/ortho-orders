import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MateriePrima } from '../types'

const STORAGE_KEY = 'ortho-materii-prime'

function loadFromStorage(): MateriePrima[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: MateriePrima[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useMateriiPrimeStore = defineStore('materiiPrime', () => {
    const items = ref<MateriePrima[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)
    const valoareTotalaStoc = computed(() =>
        items.value.reduce((sum, item) => sum + item.pret * item.stoc, 0)
    )

    function getById(id: string): MateriePrima | undefined {
        return items.value.find(item => item.id === id)
    }

    function add(item: Omit<MateriePrima, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newItem: MateriePrima = {
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function update(id: string, data: Partial<Omit<MateriePrima, 'id' | 'createdAt' | 'updatedAt'>>) {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
            items.value[index] = {
                ...items.value[index],
                ...data,
                updatedAt: new Date().toISOString()
            }
            saveToStorage(items.value)
        }
    }

    function remove(id: string) {
        items.value = items.value.filter(item => item.id !== id)
        saveToStorage(items.value)
    }

    return { items, totalItems, valoareTotalaStoc, getById, add, update, remove }
})
