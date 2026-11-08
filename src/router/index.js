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
    path: '/member-report',
    name: 'MemberReport',
    component: () => import('@/views/MemberReportView.vue'),
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
  // 使用 Supabase Auth 取得 Session
  const { data: { session } } = await supabase.auth.getSession()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !session) {
    // 需要權限但未登入，跳轉至登入頁
    next('/login')
  } else if (to.path === '/login' && session) {
    // 已登入且嘗試去登入頁，跳轉回首頁
    next('/')
  } else {
    next()
  }
})

export default router

/* ═══ EOF ═══
F: AI-WA-FS/src/router/index.js
V: 1794000000
W: ai-wa-fs-002
═══ */