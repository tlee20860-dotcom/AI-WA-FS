<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系統設定</h2>
    </div>

    <el-tabs v-model="activeTab" class="settings-tabs">
      
      <!-- 家庭成員管理 -->
      <el-tab-pane label="家庭成員" name="members">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">新增後，記帳時的下拉選單會自動更新。</span>
            <el-button type="primary" @click="openDialog('member')">+ 新增成員</el-button>
          </div>
          <el-table :data="members" style="width: 100%" stripe v-loading="loading">
            <el-table-column prop="name" label="成員名稱" min-width="120" />
            <el-table-column prop="role" label="角色/關係" width="150" />
            <el-table-column label="操作" width="150" align="center">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="openDialog('member', scope.row)">編輯</el-button>
                <el-button type="danger" link size="small" @click="deleteItem('members', scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 支出分類管理 -->
      <el-tab-pane label="支出分類" name="categories">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">新增後，記帳時的分類選單會自動更新。</span>
            <el-button type="primary" @click="openDialog('category')">+ 新增分類</el-button>
          </div>
          <el-table :data="categories" style="width: 100%" stripe v-loading="loading">
            <el-table-column prop="name" label="分類名稱" min-width="120" />
            <el-table-column label="操作" width="150" align="center">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="openDialog('category', scope.row)">編輯</el-button>
                <el-button type="danger" link size="small" @click="deleteItem('expense_categories', scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 固定支出模板 -->
      <el-tab-pane label="固定支出" name="fixed">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">設定後，每月初可在「待辦與紀錄中心」一鍵匯入這些項目。</span>
            <el-button type="primary" @click="openDialog('fixed')">+ 新增模板</el-button>
          </div>
          <el-table :data="fixedExpenses" style="width: 100%" stripe v-loading="loading">
            <el-table-column prop="name" label="項目名稱" min-width="120" />
            <el-table-column prop="amount" label="金額" width="100" align="right">
              <template #default="scope">
                <span class="text-red font-bold">HK$ {{ scope.row.amount.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="payer_name" label="對象" width="100" />
            <el-table-column prop="category_name" label="分類" width="120" />
            <el-table-column label="操作" width="150" align="center">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="openDialog('fixed', scope.row)">編輯</el-button>
                <el-button type="danger" link size="small" @click="deleteItem('fixed_expenses', scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 🆕 帳號與權限管理 -->
      <el-tab-pane label="帳號與權限" name="users">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">在此新增登入系統的帳號，並指派角色權限。</span>
            <el-button type="primary" @click="openUserDialog()">+ 新增帳號</el-button>
          </div>
          <el-table :data="appUsers" style="width: 100%" stripe v-loading="userLoading">
            <el-table-column prop="username" label="帳號" min-width="120" />
            <el-table-column prop="role" label="角色權限" width="150">
              <template #default="scope">
                <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'" size="small" effect="light">
                  {{ scope.row.role === 'admin' ? '管理員' : '一般使用者' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="openUserDialog(scope.row)">編輯</el-button>
                <el-button type="danger" link size="small" @click="deleteUser(scope.row)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 🆕 資料管理（危險區域） -->
      <el-tab-pane label="資料管理" name="data">
        <div class="tab-content danger-zone">
          <h3 class="danger-title">⚠️ 危險區域 (Danger Zone)</h3>
          <p class="danger-desc">以下操作將會永久刪除資料庫中的紀錄，且無法復原。請謹慎操作。</p>

          <div class="danger-card">
            <div class="danger-info">
              <h4>清空所有記帳紀錄</h4>
              <p>刪除所有的收支流水、保險繳費狀態、基金快照與銀行對帳紀錄。保留成員與保單主檔。</p>
            </div>
            <el-button type="danger" plain @click="clearAllRecords" :loading="clearing">清空紀錄</el-button>
          </div>

          <div class="danger-card">
            <div class="danger-info">
              <h3>重置整個系統</h3>
              <p>刪除所有資料，包含成員、保單、基金、分類與所有流水。讓系統回到全新狀態。</p>
            </div>
            <el-button type="danger" @click="resetSystem" :loading="clearing">徹底重置</el-button>
          </div>

          <div class="info-card">
            <h4>資料狀態</h4>
            <ul class="data-stats">
              <li>家庭成員：{{ members.length }} 人</li>
              <li>支出分類：{{ categories.length }} 個</li>
              <li>固定支出模板：{{ fixedExpenses.length }} 個</li>
            </ul>
          </div>
        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- 共用編輯彈窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" max-width="400px">
      <el-form :model="form" label-position="top">
        <el-form-item :label="formType === 'member' ? '成員名稱' : (formType === 'category' ? '分類名稱' : '項目名稱')" required>
          <el-input v-model="form.name" />
        </el-form-item>
        
        <el-form-item v-if="formType === 'member'" label="角色/關係">
          <el-input v-model="form.role" placeholder="例如：家庭成員" />
        </el-form-item>

        <template v-if="formType === 'fixed'">
          <el-form-item label="金額 (HKD)" required>
            <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="對象" required>
            <el-select v-model="form.payer_name" style="width: 100%">
              <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="分類" required>
            <el-select v-model="form.category_name" style="width: 100%">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 🆕 帳號編輯彈窗 -->
    <el-dialog v-model="userDialogVisible" :title="isEditUser ? '編輯帳號' : '新增帳號'" width="90%" max-width="400px">
      <el-form :model="userForm" label-position="top">
        <el-form-item label="帳號名稱" required>
          <el-input v-model="userForm.username" placeholder="例如：admin" :disabled="isEditUser" />
        </el-form-item>
        <el-form-item label="密碼" required>
          <el-input v-model="userForm.password" type="password" show-password placeholder="請輸入密碼" />
        </el-form-item>
        <el-form-item label="角色權限" required>
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理員 (全權限)" value="admin" />
            <el-option label="一般使用者 (僅檢視)" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userSubmitting" @click="submitUser">確認儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('members')
const members = ref([])
const categories = ref([])
const fixedExpenses = ref([])
const loading = ref(false)
const submitting = ref(false)
const clearing = ref(false)
const dialogVisible = ref(false)

// 帳號管理狀態
const appUsers = ref([])
const userLoading = ref(false)
const userDialogVisible = ref(false)
const userSubmitting = ref(false)
const isEditUser = ref(false)
const userForm = ref({ id: null, username: '', password: '', role: 'viewer' })

const formType = ref('member')
const form = ref({ id: null, name: '', role: '', amount: 0, payer_name: '', category_name: '' })
const isEdit = ref(false)

const dialogTitle = computed(() => {
  const typeName = formType.value === 'member' ? '成員' : (formType.value === 'category' ? '分類' : '固定支出模板')
  return isEdit.value ? `編輯${typeName}` : `新增${typeName}`
})

// 取得當前登入帳號
const currentUsername = computed(() => {
  const uStr = localStorage.getItem('app_user')
  return uStr ? JSON.parse(uStr).username : ''
})

const fetchData = async () => {
  loading.value = true
  const [mRes, cRes, fRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: true }),
    supabase.from('expense_categories').select('*').order('created_at', { ascending: true }),
    supabase.from('fixed_expenses').select('*').order('created_at', { ascending: true })
  ])
  
  if (!mRes.error) members.value = mRes.data || []
  if (!cRes.error) categories.value = cRes.data || []
  if (!fRes.error) fixedExpenses.value = fRes.data || []
  
  loading.value = false
}

const fetchUsers = async () => {
  userLoading.value = true
  const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: true })
  if (!error && data) {
    appUsers.value = data
  }
  userLoading.value = false
}

const openDialog = (type, row = null) => {
  formType.value = type
  if (row) {
    isEdit.value = true
    form.value = { 
      id: row.id, 
      name: row.name, 
      role: row.role || '', 
      amount: row.amount || 0,
      payer_name: row.payer_name || (members.value.length ? members.value[0].name : ''),
      category_name: row.category_name || (categories.value.length ? categories.value[0].name : '')
    }
  } else {
    isEdit.value = false
    form.value = { 
      id: null, 
      name: '', 
      role: '', 
      amount: 0,
      payer_name: members.value.length ? members.value[0].name : '',
      category_name: categories.value.length ? categories.value[0].name : ''
    }
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name) return ElMessage.warning('請輸入名稱')
  submitting.value = true

  let table = ''
  let payload = { name: form.value.name }

  if (formType.value === 'member') {
    table = 'members'
    payload.role = form.value.role
  } else if (formType.value === 'category') {
    table = 'expense_categories'
  } else if (formType.value === 'fixed') {
    table = 'fixed_expenses'
    payload.amount = form.value.amount
    payload.payer_name = form.value.payer_name
    payload.category_name = form.value.category_name
  }

  if (isEdit.value) {
    const { error } = await supabase.from(table).update(payload).eq('id', form.value.id)
    if (error) ElMessage.error('更新失敗：' + error.message)
    else {
      ElMessage.success('✅ 已更新')
      dialogVisible.value = false
      fetchData()
    }
  } else {
    payload.family_id = '00000000-0000-0000-0000-000000000001'
    const { error } = await supabase.from(table).insert([payload])
    if (error) ElMessage.error('新增失敗：' + error.message)
    else {
      ElMessage.success('✅ 已新增')
      dialogVisible.value = false
      fetchData()
    }
  }
  submitting.value = false
}

const deleteItem = async (table, id) => {
  try {
    await ElMessageBox.confirm('刪除後無法復原，確定嗎？', '警告', { type: 'warning' })
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    ElMessage.success('已刪除')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗')
  }
}

// 🆕 帳號管理相關
const openUserDialog = (user = null) => {
  if (user) {
    isEditUser.value = true
    userForm.value = { id: user.id, username: user.username, password: user.password, role: user.role }
  } else {
    isEditUser.value = false
    userForm.value = { id: null, username: '', password: '', role: 'viewer' }
  }
  userDialogVisible.value = true
}

const submitUser = async () => {
  if (!userForm.value.username || !userForm.value.password) return ElMessage.warning('請填寫完整資訊')
  
  userSubmitting.value = true
  
  if (isEditUser.value) {
    // 更新時不修改 username
    const { error } = await supabase.from('app_users').update({
      password: userForm.value.password,
      role: userForm.value.role
    }).eq('id', userForm.value.id)
    
    if (error) ElMessage.error('更新失敗：' + error.message)
    else {
      ElMessage.success('✅ 帳號已更新')
      userDialogVisible.value = false
      fetchUsers()
    }
  } else {
    // 檢查是否重複
    const existing = appUsers.value.find(u => u.username === userForm.value.username)
    if (existing) {
      userSubmitting.value = false
      return ElMessage.warning('該帳號名稱已存在')
    }

    const { error } = await supabase.from('app_users').insert([{
      username: userForm.value.username,
      password: userForm.value.password,
      role: userForm.value.role
    }])
    
    if (error) ElMessage.error('新增失敗：' + error.message)
    else {
      ElMessage.success('✅ 帳號已新增')
      userDialogVisible.value = false
      fetchUsers()
    }
  }
  userSubmitting.value = false
}

const deleteUser = async (user) => {
  if (user.username === currentUsername.value) {
    return ElMessage.error('您無法刪除目前正在登入的帳號！')
  }
  
  try {
    await ElMessageBox.confirm(`確定要刪除帳號「${user.username}」嗎？`, '警告', { type: 'warning' })
    const { error } = await supabase.from('app_users').delete().eq('id', user.id)
    if (error) throw error
    ElMessage.success('已刪除帳號')
    fetchUsers()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗')
  }
}

// 危險區域
const clearAllRecords = async () => {
  try {
    await ElMessageBox.confirm('這將清空所有收支、保險狀態與基金快照，但會保留你的成員與主檔設定。確定要繼續嗎？', '高風險操作', { type: 'error', confirmButtonText: '確定清空' })
    clearing.value = true
    const familyId = '00000000-0000-0000-0000-000000000001'

    await Promise.all([
      supabase.from('expenses').delete().eq('family_id', familyId),
      supabase.from('incomes').delete().eq('family_id', familyId),
      supabase.from('insurance_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('fund_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('monthly_balances').delete().eq('family_id', familyId)
    ])

    ElMessage.success('✅ 記帳紀錄已全部清空')
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('清空失敗')
  } finally {
    clearing.value = false
  }
}

const resetSystem = async () => {
  try {
    await ElMessageBox.confirm('【警告】這將刪除系統內「所有」的資料，包含成員、保單、基金與所有收支紀錄。系統將回到全新狀態。你確定嗎？', '徹底重置', { type: 'error', confirmButtonText: '我確定要重置' })
    clearing.value = true
    const familyId = '00000000-0000-0000-0000-000000000001'

    await Promise.all([
      supabase.from('expenses').delete().eq('family_id', familyId),
      supabase.from('incomes').delete().eq('family_id', familyId),
      supabase.from('insurance_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('fund_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('monthly_balances').delete().eq('family_id', familyId),
      supabase.from('fixed_expenses').delete().eq('family_id', familyId),
      supabase.from('funds').delete().eq('family_id', familyId),
      supabase.from('insurance_policies').delete().eq('family_id', familyId),
      supabase.from('expense_categories').delete().eq('family_id', familyId),
      supabase.from('members').delete().eq('family_id', familyId)
    ])

    ElMessage.success('✅ 系統已徹底重置')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('重置失敗')
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchUsers()
})
</script>

<style scoped>
.settings-container { width: 100%; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }

.settings-tabs { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }
.tab-content { padding-top: 10px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.hint { font-size: 13px; color: #64748b; }
.text-red { color: #ef4444; }
.font-bold { font-weight: 600; }

/* 🆕 危險區域樣式 */
.danger-zone { max-width: 800px; }
.danger-title { color: #ef4444; margin-bottom: 5px; }
.danger-desc { color: #64748b; font-size: 14px; margin-bottom: 20px; }

.danger-card { border: 1px solid #fca5a5; background: #fef2f2; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.danger-info h4 { margin: 0 0 5px 0; color: #b91c1c; font-size: 16px; }
.danger-info p { margin: 0; color: #991b1b; font-size: 13px; }

.info-card { border: 1px solid #e2e8f0; background: #f8fafc; padding: 20px; border-radius: 12px; }
.info-card h4 { margin: 0 0 10px 0; color: #1e293b; font-size: 16px; }
.data-stats { margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8; }

@media (max-width: 768px) {
  .action-bar { flex-direction: column; align-items: flex-start; gap: 10px; }
  .danger-card { flex-direction: column; align-items: flex-start; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettingsView.vue
V: 1793996000
W: ai-wa-fs-002
═══ -->