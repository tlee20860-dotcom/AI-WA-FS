import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/config/supabase'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/cashflow',
    name: 'Cashflow',
    component: () => import('@/views/CashflowView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settlement',
    name: 'Settlement',
    component: () => import('@/views/SettlementView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/insurance',
    name: 'Insurance',
    component: () => import('@/views/InsuranceView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/fund',
    name: 'Fund',
    component: () => import('@/views/FundView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/annual-report',
    name: 'AnnualReport',
    component: () => import('@/views/AnnualReportView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !session) next('/login')
  else if (to.path === '/login' && session) next('/')
  else next()
})

export default router

/* ═══ EOF ═══
F: AI-WA-FS/src/router/index.js
V: 1793810700
W: ai-wa-fs-001
═══ */