import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'warning'
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([])

    function add(message: string, type: Toast['type'] = 'success') {
        const id = crypto.randomUUID()
        toasts.value.push({ id, message, type })
        setTimeout(() => remove(id), 4000)
    }

    function remove(id: string) {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    function success(message: string) { add(message, 'success') }
    function error(message: string) { add(message, 'error') }
    function warning(message: string) { add(message, 'warning') }

    return { toasts, add, remove, success, error, warning }
})
