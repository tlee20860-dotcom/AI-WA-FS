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

      <!-- 🆕 固定支出模板 -->
      <el-tab-pane label="固定支出" name="fixed">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">設定後，每月初可在「收支流水」一鍵匯入這些項目。</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('members')
const members = ref([])
const categories = ref([])
const fixedExpenses = ref([]) // 🆕 固定支出列表
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)

const formType = ref('member') // 'member', 'category', 'fixed'
const form = ref({ id: null, name: '', role: '', amount: 0, payer_name: '', category_name: '' })
const isEdit = ref(false)

const dialogTitle = computed(() => {
  const typeName = formType.value === 'member' ? '成員' : (formType.value === 'category' ? '分類' : '固定支出模板')
  return isEdit.value ? `編輯${typeName}` : `新增${typeName}`
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

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.settings-container { width: 100%; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }

.settings-tabs { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
.tab-content { padding-top: 10px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.hint { font-size: 13px; color: #64748b; }
.text-red { color: #ef4444; }
.font-bold { font-weight: 600; }

@media (max-width: 768px) {
  .action-bar { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettingsView.vue
V: 1793809800
W: ai-wa-fs-001
═══ -->