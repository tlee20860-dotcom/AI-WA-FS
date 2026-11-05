<template>
  <!-- 如果網址是登入頁，就只顯示登入畫面 -->
  <router-view v-if="$route.path === '/login'" />
  
  <!-- 其他頁面顯示側邊欄與主內容區 -->
  <el-container v-else class="app-layout">
    <!-- 側邊選單 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <h2>家庭入帳 V3</h2>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/cashflow">
          <el-icon><Money /></el-icon>
          <span>收支流水</span>
        </el-menu-item>
        <el-menu-item index="/insurance">
          <el-icon><Umbrella /></el-icon>
          <span>保險供款</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主內容區 -->
    <el-container>
      <el-header class="header">
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
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { HomeFilled, Money, Umbrella } from '@element-plus/icons-vue'

const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}
</script>

<style>
/* 全局重置與佈局樣式 */
body { margin: 0; padding: 0; font-family: 'Noto Sans TC', sans-serif; }
.app-layout { height: 100vh; }
.sidebar { background-color: #1e293b; color: white; }
.logo { height: 60px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #334155; }
.logo h2 { margin: 0; font-size: 18px; color: #f8fafc; }
.sidebar .el-menu { border-right: none; }
.header { background-color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
.header-title { font-weight: bold; color: #334155; }
.main-content { background-color: #f1f5f9; padding: 20px; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/App.vue
V: 1793806200
W: ai-wa-fs-001
═══ -->