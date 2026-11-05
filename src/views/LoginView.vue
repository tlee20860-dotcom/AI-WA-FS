<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>家庭入帳 V3</h2>
        <p>請輸入您的專屬帳號登入</p>
      </div>
      
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input 
            v-model="account" 
            placeholder="請輸入帳號 (例如: admin)" 
            size="large"
            prefix-icon="User"
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
          />
        </el-form-item>
        
        <el-button 
          type="primary" 
          native-type="submit" 
          :loading="loading" 
          class="login-btn"
          size="large"
        >
          登入
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'

const account = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!account.value || !password.value) {
    ElMessage.warning('請輸入帳號與密碼')
    return
  }

  loading.value = true
  try {
    const cleanAccount = account.value.trim()
    // 👇 這裡把網域改成了合法的 fs-app.com
    const virtualEmail = cleanAccount.includes('@') 
      ? cleanAccount 
      : `${cleanAccount}@fs-app.com`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password.value,
    })

    if (error) {
      ElMessage.error('登入失敗：' + error.message)
      throw error
    }
    
    ElMessage.success('登入成功！')
    window.location.reload()
    
  } catch (error) {
    console.error('詳細錯誤:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: var(--bg-color); }
.login-card { width: 100%; max-width: 400px; padding: 20px; }
.login-header { text-align: center; margin-bottom: 30px; }
.login-header h2 { margin: 0 0 10px 0; color: var(--text-main); }
.login-header p { margin: 0; color: var(--text-secondary); font-size: 14px; }
.login-btn { width: 100%; margin-top: 10px; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/LoginView.vue
V: 1793804700
W: ai-wa-fs-001
═══ -->