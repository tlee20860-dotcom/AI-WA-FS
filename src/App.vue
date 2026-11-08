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
        <div class="logo-icon">
          <el-icon><Money /></el-icon>
        </div>
        <h2 v-if="!isCollapse || isMobile">家庭入帳 V3</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        background-color="transparent"
        text-color="#64748B"
        active-text-color="#6366F1"
        :collapse="isCollapse && !isMobile"
        @select="onMenuSelect"
        class="custom-menu"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>年度總覽</template>
        </el-menu-item>
        <el-menu-item index="/cashflow">
          <el-icon><Money /></el-icon>
          <template #title>月度總覽</template>
        </el-menu-item>
        <el-menu-item index="/member-report">
          <el-icon><User /></el-icon>
          <template #title>成員收支</template>
        </el-menu-item>
        <el-menu-item index="/settlement">
          <el-icon><Tickets /></el-icon>
          <template #title>待辦與紀錄中心</template>
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
        <div class="header-title">歡迎回來，{{ currentUsername }}</div>
        <el-button type="danger" plain size="small" class="logout-btn" @click="handleLogout">登出</el-button>
      </el-header>
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { HomeFilled, Money, Umbrella, Menu, TrendCharts, Document, Setting, Tickets, User } from '@element-plus/icons-vue'

const router = useRouter()
const isCollapse = ref(false)
const isMobile = ref(false)
const isMobileOpen = ref(false)

// 取得當前登入帳號名稱
const currentUsername = computed(() => {
  const userStr = localStorage.getItem('app_user')
  if (!userStr) return '使用者'
  try {
    const user = JSON.parse(userStr)
    return user.username || '使用者'
  } catch (e) {
    return '使用者'
  }
})

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

const handleLogout = () => {
  localStorage.removeItem('app_user')
  router.replace('/login')
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
body { margin: 0; padding: 0; font-family: 'Noto Sans TC', sans-serif; background-color: #F4F7FB; }

/* 佈局基礎 */
.app-layout { display: flex; height: 100vh; overflow: hidden; width: 100vw; }
.main-wrapper { flex: 1; width: 0; overflow: hidden; display: flex; flex-direction: column; }

/* 側邊欄基礎樣式 - 白底 */
.sidebar { 
  background-color: #ffffff; 
  border-right: 1px solid rgba(0,0,0,0.04);
  z-index: 1000;
  width: 240px;
  display: flex;
  flex-direction: column;
}
.sidebar.is-collapsed {
  width: 64px;
}

/* Logo 區域 */
.logo { 
  height: 64px; 
  display: flex; 
  align-items: center; 
  padding: 0 20px; 
  gap: 12px;
  overflow: hidden; 
}
.logo-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, #6366F1, #06B6D4);
  border-radius: 8px;
  display: flex; justify-content: center; align-items: center;
  color: white; flex-shrink: 0;
}
.logo h2 { margin: 0; font-size: 18px; color: #1e293b; white-space: nowrap; font-weight: 700; }

/* 選單樣式覆寫 */
.custom-menu { border-right: none; padding: 10px; }
.el-menu-item {
  border-radius: 10px;
  margin-bottom: 4px;
  height: 44px;
  line-height: 44px;
  font-weight: 500;
}
.el-menu-item:hover {
  background-color: #F8FAFC !important;
}
.el-menu-item.is-active {
  background-color: #EEF2FF !important;
  font-weight: 700;
}
.el-menu-item.is-active .el-icon {
  color: #6366F1;
}

/* 頂部導覽列 - 毛玻璃效果 */
.header { 
  background-color: rgba(255, 255, 255, 0.8); 
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex; 
  align-items: center; 
  border-bottom: 1px solid rgba(0,0,0,0.04); 
  padding: 0 20px; 
  height: 64px; 
  flex-shrink: 0; 
  z-index: 999;
}
.header-title { font-weight: 700; color: #1e293b; margin-left: 10px; flex: 1; font-size: 16px; }
.menu-toggle { margin-right: 10px; color: #64748b; padding: 8px; border-radius: 8px; }
.menu-toggle:hover { background-color: #F1F5F9; }

.logout-btn { border-radius: 8px; border: none; background-color: #FEF2F2; color: #EF4444; }
.logout-btn:hover { background-color: #FEE2E2; }

/* 內容區 */
.main-content { 
  background-color: #F4F7FB; 
  padding: 24px; 
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
    box-shadow: 4px 0 24px rgba(0,0,0,0.1);
  }
  .sidebar.is-mobile-hidden {
    transform: translateX(-100%);
    width: 240px;
  }
  .sidebar-mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 999;
  }
  .main-content {
    padding: 16px;
  }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/App.vue
V: 1793995000
W: ai-wa-fs-002
═══ -->