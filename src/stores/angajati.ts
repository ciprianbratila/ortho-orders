import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Angajat } from '../types'

const STORAGE_KEY = 'ortho-angajati'

function loadFromStorage(): Angajat[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: Angajat[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useAngajatiStore = defineStore('angajati', () => {
    const items = ref<Angajat[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)

    const angajatiActivi = computed(() =>
        items.value.filter(a => a.activ)
    )

    function getById(id: string): Angajat | undefined {
        return items.value.find(item => item.id === id)
    }

    function add(item: Omit<Angajat, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newItem: Angajat = {
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function update(id: string, data: Partial<Omit<Angajat, 'id' | 'createdAt' | 'updatedAt'>>) {
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

    return {
        items,
        totalItems,
        angajatiActivi,
        getById,
        add,
        update,
        remove
    }
})
