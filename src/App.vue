<template>
  <router-view v-if="$route.path === '/login'" />
  
  <el-container v-else class="app-layout">
    <!-- 🚨 手機端遮罩 -->
    <div v-if="isMobile && isMobileOpen" class="sidebar-mask" @click="isMobileOpen = false"></div>

    <!-- 側邊選單 -->
    <el-aside 
      :class="{ 
        'sidebar': true, 
        'is-collapsed': isCollapse && !isMobile,
        'is-mobile-hidden': isMobile && !isMobileOpen 
      }" 
      class="transition-all"
    >
      <div class="logo">
        <h2 v-if="!isCollapse || isMobile">家庭入帳 V3</h2>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
        :collapse="isCollapse && !isMobile"
        @select="onMenuSelect"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>
        <el-menu-item index="/cashflow">
          <el-icon><Money /></el-icon>
          <template #title>收支流水</template>
        </el-menu-item>
        <el-menu-item index="/settlement">
          <el-icon><Tickets /></el-icon>
          <template #title>待轉帳表</template>
        </el-menu-item>
        <el-menu-item index="/insurance">
          <el-icon><Umbrella /></el-icon>
          <template #title>保險供款</template>
        </el-menu-item>
        <el-menu-item index="/fund">
          <el-icon><TrendCharts /></el-icon>
          <template #title>基金投資</template>
        </el-menu-item>
        <el-menu-item index="/annual-report">
          <el-icon><Document /></el-icon>
          <template #title>年度報表</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系統設定</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主內容區 -->
    <el-container class="main-wrapper">
      <el-header class="header">
        <el-button class="menu-toggle" text @click="toggleMenu">
          <el-icon :size="20"><Menu /></el-icon>
        </el-button>
        <div class="header-title">歡迎回來</div>
        <el-button type="danger" plain size="small" @click="handleLogout">登出</el-button>
      </el-header>
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/config/supabase'
// 🆕 引入 Tickets 圖示
import { HomeFilled, Money, Umbrella, Menu, TrendCharts, Document, Setting, Tickets } from '@element-plus/icons-vue'

const isCollapse = ref(false)
const isMobile = ref(false)
const isMobileOpen = ref(false)

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    isMobileOpen.value = false
  }
}

const toggleMenu = () => {
  if (isMobile.value) {
    isMobileOpen.value = !isMobileOpen.value
  } else {
    isCollapse.value = !isCollapse.value
  }
}

const onMenuSelect = () => {
  if (isMobile.value) {
    isMobileOpen.value = false
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style>
body { margin: 0; padding: 0; font-family: 'Noto Sans TC', sans-serif; background-color: #f1f5f9; }

/* 佈局基礎 */
.app-layout { display: flex; height: 100vh; overflow: hidden; width: 100vw; }
.main-wrapper { flex: 1; width: 0; overflow: hidden; display: flex; flex-direction: column; }

/* 側邊欄基礎樣式 */
.sidebar { 
  background-color: #1e293b; 
  color: white; 
  z-index: 1000;
  width: 220px;
}
.sidebar.is-collapsed {
  width: 64px;
}
.logo { height: 60px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #334155; overflow: hidden; }
.logo h2 { margin: 0; font-size: 18px; color: #f8fafc; white-space: nowrap; }
.sidebar .el-menu { border-right: none; }

/* 頂部導覽列 */
.header { background-color: white; display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; padding: 0 15px; height: 60px; flex-shrink: 0; }
.header-title { font-weight: bold; color: #334155; margin-left: 10px; flex: 1; }
.menu-toggle { margin-right: 10px; color: #64748b; padding: 8px; }

/* 內容區 */
.main-content { 
  background-color: #f1f5f9; 
  padding: 15px; 
  overflow-y: auto; 
  overflow-x: hidden; 
  flex: 1; 
}

/* 過渡動畫 */
.transition-all { transition: width 0.3s, transform 0.3s; }

/* 🚨 手機端專用樣式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
  }
  .sidebar.is-mobile-hidden {
    transform: translateX(-100%);
    width: 220px;
  }
  .sidebar-mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
  }
  .main-content {
    padding: 10px;
  }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/App.vue
V: 1793810800
W: ai-wa-fs-001
═══ -->