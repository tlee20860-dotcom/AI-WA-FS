<template>
  <div class="dashboard-container">
    <el-card class="header-card">
      <div class="header-content">
        <h2>工作台 (Dashboard)</h2>
        <el-button type="danger" plain @click="handleLogout">登出</el-button>
      </div>
      <p class="welcome-text">歡迎回來！這裡之後會顯示您的總資產與待辦事項。</p>
    </el-card>
  </div>
</template>

<script setup>
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    ElMessage.error('登出失敗：' + error.message)
  } else {
    ElMessage.success('已安全登出')
    window.location.reload() // 重新載入以回到登入頁
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.header-content h2 {
  margin: 0;
  color: var(--text-main);
}
.welcome-text {
  margin: 0;
  color: var(--text-secondary);
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/DashboardView.vue
V: 1793804300
W: ai-wa-fs-001
═══ -->