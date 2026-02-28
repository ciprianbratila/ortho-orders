import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../pages/LoginPage.vue'),
            meta: { title: 'Autentificare', public: true }
        },
        {
            path: '/',
            name: 'dashboard',
            component: () => import('../pages/DashboardPage.vue'),
            meta: { title: 'Dashboard', icon: 'dashboard', module: 'dashboard' }
        },
        {
            path: '/materii-prime',
            name: 'materii-prime',
            component: () => import('../pages/MateriiPrimePage.vue'),
            meta: { title: 'Materii Prime', icon: 'inventory', module: 'materii-prime' }
        },
        {
            path: '/produse',
            name: 'produse',
            component: () => import('../pages/ProdusePage.vue'),
            meta: { title: 'Produse', icon: 'category', module: 'produse' }
        },
        {
            path: '/comenzi',
            name: 'comenzi',
            component: () => import('../pages/ComenziPage.vue'),
            meta: { title: 'Comenzi', icon: 'shopping_cart', module: 'comenzi' }
        },
        {
            path: '/clienti',
            name: 'clienti',
            component: () => import('../pages/ClientiPage.vue'),
            meta: { title: 'Clienți', icon: 'people', module: 'clienti' }
        },
        {
            path: '/angajati',
            name: 'angajati',
            component: () => import('../pages/AngajatiPage.vue'),
            meta: { title: 'Angajați', icon: 'badge', module: 'angajati' }
        },
        {
            path: '/facturi',
            name: 'facturi',
            component: () => import('../pages/FacturiPage.vue'),
            meta: { title: 'Facturi', icon: 'receipt_long', module: 'facturi' }
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../pages/AdminPage.vue'),
            meta: { title: 'Administrare', icon: 'admin_panel_settings', module: 'admin' }
        }
    ]
})

// Navigation guard
router.beforeEach((to, _from, next) => {
    // Public routes (login)
    if (to.meta.public) {
        return next()
    }

    // Check auth from localStorage
    const session = localStorage.getItem('ortho-session')
    if (!session) {
        return next({ name: 'login' })
    }

    // Check module access
    const user = JSON.parse(session)
    const groupsData = localStorage.getItem('ortho-grupuri')
    if (groupsData && to.meta.module) {
        const groups = JSON.parse(groupsData)
        const userGroup = groups.find((g: any) => g.id === user.grupId)
        if (userGroup && !userGroup.moduleAcces.includes(to.meta.module)) {
            // Redirect to dashboard if no access
            return next({ name: 'dashboard' })
        }
    }

    next()
})

export default router
