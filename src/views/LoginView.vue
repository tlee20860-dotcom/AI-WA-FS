<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>家庭入帳 V3</h2>
        <p>請輸入您的專屬帳號登入</p>
      </div>
      
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="account" placeholder="請輸入帳號" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" type="password" placeholder="請輸入密碼" size="large" show-password />
        </el-form-item>
        
        <el-button type="primary" native-type="submit" :loading="loading" class="login-btn" size="large">
          登入
        </el-button>
      </el-form>

      <!-- 🚨 這裡會把詳細錯誤印在畫面上，手機才看得到 -->
      <div v-if="errorMsg" style="margin-top: 20px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 13px; word-break: break-all;">
        錯誤原因：{{ errorMsg }}
      </div>

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
const errorMsg = ref('') // 🚨 新增錯誤顯示變數

const handleLogin = async () => {
  if (!account.value || !password.value) {
    ElMessage.warning('請輸入帳號與密碼')
    return
  }

  loading.value = true
  errorMsg.value = ''
  
  try {
    const cleanAccount = account.value.trim()
    const virtualEmail = cleanAccount.includes('@') ? cleanAccount : `${cleanAccount}@fs-app.com`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password.value,
    })

    if (error) throw error
    
    ElMessage.success('登入成功！')
    window.location.reload()
    
  } catch (error) {
    // 🚨 將詳細錯誤寫入畫面
    errorMsg.value = error.message || JSON.stringify(error)
    ElMessage.error('登入失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #F2F3F5; }
.login-card { width: 100%; max-width: 400px; padding: 20px; }
.login-header { text-align: center; margin-bottom: 30px; }
.login-header h2 { margin: 0 0 10px 0; color: #303133; }
.login-header p { margin: 0; color: #909399; font-size: 14px; }
.login-btn { width: 100%; margin-top: 10px; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/LoginView.vue
V: 1793805800
W: ai-wa-fs-001
═══ -->