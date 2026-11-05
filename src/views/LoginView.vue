<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>家庭入帳 V3</h2>
        <p>請登入以存取您的財務資料</p>
      </div>
      
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input 
            v-model="email" 
            placeholder="請輸入 Email" 
            size="large"
            prefix-icon="Message"
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

const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    ElMessage.warning('請輸入帳號與密碼')
    return
  }

  loading.value = true
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error
    
    ElMessage.success('登入成功！')
    // 後續這裡會加入跳轉到首頁的程式碼
    
  } catch (error) {
    ElMessage.error('登入失敗：' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--bg-color);
}
.login-card {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}
.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.login-header h2 {
  margin: 0 0 10px 0;
  color: var(--text-main);
}
.login-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.login-btn {
  width: 100%;
  margin-top: 10px;
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/LoginView.vue
V: 1793804200
W: ai-wa-fs-001
═══ -->