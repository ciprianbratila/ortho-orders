import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Client } from '../types'

const STORAGE_KEY = 'ortho-clienti'

function loadFromStorage(): Client[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: Client[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useClientiStore = defineStore('clienti', () => {
    const items = ref<Client[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)

    function getById(id: string): Client | undefined {
        return items.value.find(item => item.id === id)
    }

    function getNumeComplet(client: Client): string {
        return `${client.nume} ${client.prenume}`
    }

    function add(item: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newItem: Client = {
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function update(id: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) {
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

    return { items, totalItems, getById, getNumeComplet, add, update, remove }
})
