<template>
  <router-view v-if="$route.path === '/login'" />
  
  <el-container v-else class="app-layout">
    <!-- 側邊選單 -->
    <el-aside width="auto" class="sidebar">
      <div class="logo">
        <h2>家庭入帳 V3</h2>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
        :collapse="isCollapse"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>
        <el-menu-item index="/cashflow">
          <el-icon><Money /></el-icon>
          <template #title>收支流水</template>
        </el-menu-item>
        <el-menu-item index="/insurance">
          <el-icon><Umbrella /></el-icon>
          <template #title>保險供款</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主內容區 -->
    <el-container class="main-wrapper">
      <el-header class="header">
        <el-button class="menu-toggle" text @click="isCollapse = !isCollapse">
          <el-icon><Menu /></el-icon>
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
import { ref, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { HomeFilled, Money, Umbrella, Menu } from '@element-plus/icons-vue'

const isCollapse = ref(false)

onMounted(() => {
  // 手機端預設收起側邊欄
  if (window.innerWidth < 768) {
    isCollapse.value = true
  }
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}
</script>

<style>
body { margin: 0; padding: 0; font-family: 'Noto Sans TC', sans-serif; }
.app-layout { height: 100vh; overflow: hidden; }
.sidebar { background-color: #1e293b; color: white; transition: width 0.3s; }
.logo { height: 60px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #334155; overflow: hidden; }
.logo h2 { margin: 0; font-size: 18px; color: #f8fafc; white-space: nowrap; }
.sidebar .el-menu { border-right: none; }
.main-wrapper { flex: 1; width: 100%; overflow: hidden; }
.header { background-color: white; display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; padding: 0 15px; }
.header-title { font-weight: bold; color: #334155; margin-left: 10px; flex: 1; }
.main-content { background-color: #f1f5f9; padding: 20px; overflow-y: auto; }
.menu-toggle { margin-right: 10px; color: #64748b; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/App.vue
V: 1793806700
W: ai-wa-fs-001
═══ -->