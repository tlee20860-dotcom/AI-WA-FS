import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/config/supabase'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守衛：確保未登入者無法進入系統內部
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !session) {
    // 需要登入但沒有 Session，強制跳轉到登入頁
    next('/login')
  } else if (to.path === '/login' && session) {
    // 已經登入卻想進登入頁，跳轉回首頁
    next('/')
  } else {
    next()
  }
})

export default router

/* ═══ EOF ═══
F: AI-WA-FS/src/router/index.js
V: 1793804400
W: ai-wa-fs-001
═══ */