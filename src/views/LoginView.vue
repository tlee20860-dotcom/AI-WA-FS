<template>
  <div class="login-container">
    <!-- 背景裝飾 -->
    <div class="bg-circle circle-1"></div>
    <div class="bg-circle circle-2"></div>

    <el-card class="login-card">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon><Wallet /></el-icon>
        </div>
        <h2>家庭入帳 V3</h2>
        <p>專屬家庭財務與資產管理</p>
      </div>
      
      <el-form @submit.prevent="handleLogin" class="login-form">
        <el-form-item>
          <el-input 
            v-model="account" 
            placeholder="請輸入帳號 (例如: admin)" 
            size="large" 
            prefix-icon="User"
            class="custom-input"
          />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="password" 
            type="password" 
            placeholder="請輸入密碼" 
            size="large" 
            show-password 
            prefix-icon="Lock"
            class="custom-input"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-button 
          type="primary" 
          native-type="submit" 
          :loading="loading" 
          class="login-btn" 
          size="large"
        >
          登入系統
        </el-button>
      </el-form>

      <!-- 錯誤訊息顯示 -->
      <transition name="el-fade-in">
        <div v-if="errorMsg" class="error-box">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ errorMsg }}</span>
        </div>
      </transition>

    </el-card>
    
    <div class="footer-text">
      Powered by Vue 3 & Supabase
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { Wallet, WarningFilled } from '@element-plus/icons-vue'

const account = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!account.value || !password.value) {
    ElMessage.warning('請輸入帳號與密碼')
    return
  }

  loading.value = true
  errorMsg.value = ''
  
  try {
    const cleanAccount = account.value.trim()
    // 若無 @，自動補齊虛擬 Email 後綴
    const virtualEmail = cleanAccount.includes('@') ? cleanAccount : `${cleanAccount}@fs-app.com`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password.value,
    })

    if (error) throw error
    
    ElMessage.success('登入成功！')
    // 使用 reload 強制刷新頁面，確保路由守衛重新讀取 session
    window.location.reload()
    
  } catch (error) {
    console.error(error)
    errorMsg.value = error.message === 'Invalid login credentials' 
      ? '帳號或密碼錯誤，請重新輸入' 
      : '登入失敗：' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Noto Sans TC', sans-serif;
}

/* 背景光暈裝飾 */
.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
}
.circle-1 {
  width: 300px;
  height: 300px;
  background: rgba(59, 130, 246, 0.4);
  top: -10%;
  left: -10%;
}
.circle-2 {
  width: 400px;
  height: 400px;
  background: rgba(16, 185, 129, 0.2);
  bottom: -20%;
  right: -20%;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 30px 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.logo-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32px;
  color: white;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}
.login-header h2 {
  margin: 0 0 8px 0;
  color: #f8fafc;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
}
.login-header p {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
}

.login-form :deep(.el-input__wrapper) {
  background: rgba(15, 23, 42, 0.6);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  border-radius: 8px;
}
.login-form :deep(.el-input__inner) {
  color: #e2e8f0;
}
.login-form :deep(.el-input__prefix) {
  color: #64748b;
}

.login-btn {
  width: 100%;
  margin-top: 10px;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.error-box {
  margin-top: 20px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.footer-text {
  position: absolute;
  bottom: 20px;
  color: #475569;
  font-size: 12px;
  z-index: 1;
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/LoginView.vue
V: 1793999000
W: ai-wa-fs-002
═══ -->