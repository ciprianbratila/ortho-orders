import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Produs, ComponentaProdus } from '../types'
import { useMateriiPrimeStore } from './materiiPrime'

const STORAGE_KEY = 'ortho-produse'

function loadFromStorage(): Produs[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

function saveToStorage(items: Produs[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useProduseStore = defineStore('produse', () => {
    const items = ref<Produs[]>(loadFromStorage())

    const totalItems = computed(() => items.value.length)

    function getById(id: string): Produs | undefined {
        return items.value.find(item => item.id === id)
    }

    /**
     * Returnează toate componentele unui produs, incluzând recursiv
     * componentele produsului părinte (dacă există).
     */
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

    /**
     * Calculează prețul total al unui produs, incluzând costul
     * produsului părinte (recursive).
     */
    function calculeazaPretProdus(produs: Produs): number {
        const materiiStore = useMateriiPrimeStore()
        const toateComp = getToateComponentele(produs)
        let pretComponente = 0
        for (const comp of toateComp) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                pretComponente += materie.pret * comp.cantitate
            }
        }
        // Manopera proprie + manopera produsului părinte (recursive)
        let pretManopera = produs.pretManopera
        if (produs.produsParinteId) {
            const parinte = getById(produs.produsParinteId)
            if (parinte) {
                pretManopera += calculeazaManoperaTotala(parinte)
            }
        }
        return pretComponente + pretManopera
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

    /**
     * Returnează prețul doar al componentelor proprii (fără părinte).
     */
    function calculeazaPretComponenteProprii(componente: ComponentaProdus[]): number {
        const materiiStore = useMateriiPrimeStore()
        let total = 0
        for (const comp of componente) {
            const materie = materiiStore.getById(comp.materiePrimaId)
            if (materie) {
                total += materie.pret * comp.cantitate
            }
        }
        return total
    }

    /**
     * Verifică dacă există un produs duplicat (aceleași materiale și cantități).
     * Returnează denumirea produsului duplicat sau null.
     */
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

    /**
     * Normalizează componentele (include părinte, sortează, merge duplicatele).
     */
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
        // Merge duplicates within own components
        const merged: Map<string, number> = new Map()
        for (const c of all) {
            merged.set(c.materiePrimaId, (merged.get(c.materiePrimaId) || 0) + c.cantitate)
        }
        return Array.from(merged.entries())
            .map(([materiePrimaId, cantitate]) => ({ materiePrimaId, cantitate }))
            .sort((a, b) => a.materiePrimaId.localeCompare(b.materiePrimaId))
    }

    /**
     * Returnează produsele derivate dintr-un produs dat.
     */
    function getProduseDerivate(produsId: string): Produs[] {
        return items.value.filter(p => p.produsParinteId === produsId)
    }

    function add(item: Omit<Produs, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const newItem: Produs = {
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        }
        items.value.push(newItem)
        saveToStorage(items.value)
        return newItem
    }

    function update(id: string, data: Partial<Omit<Produs, 'id' | 'createdAt' | 'updatedAt'>>) {
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
        getById,
        getToateComponentele,
        calculeazaPretProdus,
        calculeazaPretComponenteProprii,
        calculeazaManoperaTotala,
        verificaDuplicat,
        getProduseDerivate,
        add,
        update,
        remove
    }
})
