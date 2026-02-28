<script setup lang="ts">
import { computed } from 'vue'
import { useComenziStore } from '../stores/comenzi'
import { useClientiStore } from '../stores/clienti'
import { useProduseStore } from '../stores/produse'
import { useMateriiPrimeStore } from '../stores/materiiPrime'

const comenziStore = useComenziStore()
const clientiStore = useClientiStore()
const produseStore = useProduseStore()
const materiiStore = useMateriiPrimeStore()

const stats = computed(() => [
  {
    icon: 'shopping_cart',
    iconClass: 'teal',
    value: comenziStore.comenziActive.length,
    label: 'Comenzi Active',
  },
  {
    icon: 'people',
    iconClass: 'blue',
    value: clientiStore.totalItems,
    label: 'Clienți Înregistrați',
  },
  {
    icon: 'category',
    iconClass: 'amber',
    value: produseStore.totalItems,
    label: 'Produse în Catalog',
  },
  {
    icon: 'inventory_2',
    iconClass: 'green',
    value: materiiStore.totalItems,
    label: 'Materii Prime',
  },
  {
    icon: 'payments',
    iconClass: 'purple',
    value: formatCurrency(comenziStore.venitTotal),
    label: 'Venit Total Comenzi',
  },
])

const statusColors: Record<string, string> = {
  noua: 'noua',
  in_lucru: 'in_lucru',
  finalizata: 'finalizata',
  livrata: 'livrata',
  anulata: 'anulata',
}

const statusLabels: Record<string, string> = {
  noua: 'Nouă',
  in_lucru: 'În Lucru',
  finalizata: 'Finalizată',
  livrata: 'Livrată',
  anulata: 'Anulată',
}

const recentOrders = computed(() => {
  return [...comenziStore.items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
})

function getClientName(clientId: string) {
  const client = clientiStore.getById(clientId)
  return client ? `${client.nume} ${client.prenume}` : 'N/A'
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Stats Row -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon" :class="stat.iconClass">
          <span class="material-icons-outlined">{{ stat.icon }}</span>
        </div>
        <div class="stat-info">
          <h3>{{ stat.value }}</h3>
          <p>{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- Orders Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px;">
      <div class="card" style="padding: 18px; text-align: center;">
        <div style="font-size: 2rem; font-weight: 700; color: #60a5fa;">{{ comenziStore.comenziNoi.length }}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Comenzi Noi</div>
      </div>
      <div class="card" style="padding: 18px; text-align: center;">
        <div style="font-size: 2rem; font-weight: 700; color: #fbbf24;">{{ comenziStore.comenziInLucru.length }}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">În Lucru</div>
      </div>
      <div class="card" style="padding: 18px; text-align: center;">
        <div style="font-size: 2rem; font-weight: 700; color: #34d399;">{{ comenziStore.comenziFinalizate.length }}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Finalizate</div>
      </div>
      <div class="card" style="padding: 18px; text-align: center;">
        <div style="font-size: 2rem; font-weight: 700; color: #a78bfa;">{{ comenziStore.comenziLivrate.length }}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Livrate</div>
      </div>
    </div>

    <!-- Recent Orders Table -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Comenzi Recente</div>
          <div class="card-subtitle">Ultimele comenzi plasate</div>
        </div>
        <router-link to="/comenzi" class="btn btn-secondary btn-sm">
          <span class="material-icons-outlined">visibility</span>
          Vezi Toate
        </router-link>
      </div>

      <div v-if="recentOrders.length === 0" class="empty-state">
        <span class="material-icons-outlined">inbox</span>
        <h3>Nicio comandă încă</h3>
        <p>Adaugă prima comandă din secțiunea Comenzi pentru a începe.</p>
        <router-link to="/comenzi" class="btn btn-primary">
          <span class="material-icons-outlined">add</span>
          Mergi la Comenzi
        </router-link>
      </div>

      <div v-else class="table-container" style="border: none; background: transparent;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nr. Comandă</th>
              <th>Client</th>
              <th>Data</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id">
              <td style="font-weight: 600; color: var(--text-accent);">{{ order.numarComanda }}</td>
              <td>{{ getClientName(order.clientId) }}</td>
              <td style="color: var(--text-secondary);">{{ formatDate(order.dataComanda) }}</td>
              <td>
                <span class="status-badge" :class="statusColors[order.status]">
                  <span class="status-dot"></span>
                  {{ statusLabels[order.status] }}
                </span>
              </td>
              <td style="font-weight: 600;">{{ formatCurrency(order.totalCalculat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
