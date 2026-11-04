<template>
  <div class="app-container">
    <div class="loading-box">
      <h1>家庭入帳 V3</h1>
      <p>系統初始化中... 準備載入資料庫</p>
      <el-button type="primary" @click="testConnection">測試按鈕</el-button>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

const testConnection = () => {
  ElMessage.success('Vue 與 Element Plus 已成功載入！')
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Noto Sans TC', sans-serif;
  background-color: #F2F3F5;
  color: #333;
}
.app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.loading-box {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/App.vue
V: 1793804090
W: ai-wa-fs-001
═══ -->