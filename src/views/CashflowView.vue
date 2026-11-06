<template>
  <div class="cashflow-container">
    <div class="page-header">
      <div class="header-left">
        <h2>收支流水</h2>
        <el-date-picker 
          v-model="selectedMonth" 
          type="month" 
          placeholder="選擇月份" 
          value-format="YYYY-MM" 
          @change="fetchData" 
          class="month-picker"
        />
      </div>
      
      <div class="header-actions">
        <el-radio-group v-model="viewMode" class="view-toggle">
          <el-radio-button label="table">表格</el-radio-button>
          <el-radio-button label="kanban">看板</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="openAddDialog">+ 新增紀錄</el-button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <el-row :gutter="10" class="mb-20">
      <el-col :xs="12" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月總支出</div>
          <div class="stat-value text-red">HK$ {{ totalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月總收入</div>
          <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 資料顯示區 -->
    <el-card shadow="never" class="list-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="支出紀錄" name="expense">
          
          <div class="tool-bar">
            <el-button type="warning" plain icon="MagicStick" :loading="importing" @click="importFixedExpenses">
              一鍵匯入本月固定支出
            </el-button>
          </div>

          <div v-if="viewMode === 'table'" class="table-wrapper">
            <el-table :data="expenses" style="width: 100%; min-width: 600px;" stripe v-loading="loading">
              <el-table-column prop="name" label="項目名稱" min-width="150" />
              <el-table-column prop="payer_name" label="對象" width="100" />
              <el-table-column prop="category_name" label="類別" width="120">
                <template #default="scope">
                  <el-tag size="small" type="info">{{ scope.row.category_name || '未分類' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="amount" label="金額" width="120" align="right">
                <template #default="scope">
                  <span class="text-red font-bold">HK$ {{ scope.row.amount.toLocaleString() }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="狀態" width="100" align="center">
                <template #default="scope">
                  <el-tag :type="scope.row.status === '已處理' ? 'success' : 'info'" size="small">{{ scope.row.status || '未處理' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" align="center">
                <template #default="scope">
                  <el-button type="primary" link size="small" @click="toggleExpenseStatus(scope.row)">
                    {{ scope.row.status === '已處理' ? '取消處理' : '標記處理' }}
                  </el-button>
                  <el-button type="primary" link size="small" @click="openEditDialog(scope.row)">編輯</el-button>
                  <el-button type="danger" text size="small" @click="deleteRecord('expenses', scope.row.id)">刪除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-else class="kanban-wrapper" v-loading="loading">
            <div class="kanban-column">
              <div class="kanban-header pending">未處理 <el-tag size="small" type="info">{{ pendingExpenses.length }}</el-tag></div>
              <div class="kanban-list">
                <el-card v-for="item in pendingExpenses" :key="item.id" class="kanban-card" shadow="hover">
                  <div class="card-title-row">
                    <span class="title">{{ item.name }}</span>
                    <span class="amount text-red">HK$ {{ item.amount.toLocaleString() }}</span>
                  </div>
                  <div class="card-meta">
                    <el-tag size="small" type="info">{{ item.category_name || '未分類' }}</el-tag>
                    <span class="payer">{{ item.payer_name }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button type="primary" size="small" plain @click="toggleExpenseStatus(item)">標記處理</el-button>
                    <el-button type="primary" size="small" text @click="openEditDialog(item)">編輯</el-button>
                    <el-button type="danger" size="small" text @click="deleteRecord('expenses', item.id)">刪除</el-button>
                  </div>
                </el-card>
                <el-empty v-if="pendingExpenses.length === 0" description="沒有未處理項目" :image-size="60" />
              </div>
            </div>

            <div class="kanban-column">
              <div class="kanban-header done">已處理 <el-tag size="small" type="success">{{ doneExpenses.length }}</el-tag></div>
              <div class="kanban-list">
                <el-card v-for="item in doneExpenses" :key="item.id" class="kanban-card done-card" shadow="hover">
                  <div class="card-title-row">
                    <span class="title text-muted">{{ item.name }}</span>
                    <span class="amount text-muted">HK$ {{ item.amount.toLocaleString() }}</span>
                  </div>
                  <div class="card-meta">
                    <el-tag size="small" type="info">{{ item.category_name || '未分類' }}</el-tag>
                    <span class="payer">{{ item.payer_name }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button type="info" size="small" plain @click="toggleExpenseStatus(item)">取消處理</el-button>
                    <el-button type="primary" size="small" text @click="openEditDialog(item)">編輯</el-button>
                    <el-button type="danger" size="small" text @click="deleteRecord('expenses', item.id)">刪除</el-button>
                  </div>
                </el-card>
                <el-empty v-if="doneExpenses.length === 0" description="沒有已處理項目" :image-size="60" />
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="收入紀錄" name="income">
          <div class="table-wrapper">
            <el-table :data="incomes" style="width: 100%; min-width: 400px;" stripe v-loading="loading">
              <el-table-column prop="name" label="收入名稱" min-width="150" />
              <el-table-column prop="member_name" label="對象" width="100" />
              <el-table-column prop="amount" label="金額" width="120" align="right">
                <template #default="scope">
                  <span class="text-green font-bold">HK$ {{ scope.row.amount.toLocaleString() }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template #default="scope">
                  <el-button type="primary" link size="small" @click="openEditDialog(scope.row)">編輯</el-button>
                  <el-button type="danger" text size="small" @click="deleteRecord('incomes', scope.row.id)">刪除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增/編輯彈窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" max-width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="項目名稱" required>
          <el-input v-model="form.name" :placeholder="activeTab === 'expense' ? '例如：買餸、交租' : '例如：薪金、家用轉入'" />
        </el-form-item>
        <el-form-item label="金額 (HKD)" required>
          <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="對象" required>
          <el-select v-model="form.member_name" style="width: 100%">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="類別" v-if="activeTab === 'expense'">
          <!-- 保留 allow-create 允許快速新增 -->
          <el-select v-model="form.category_name" style="width: 100%" allow-create filterable default-first-option>
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="狀態" v-if="activeTab === 'expense'">
          <el-radio-group v-model="form.status">
            <el-radio label="未處理">未處理</el-radio>
            <el-radio label="已處理">已處理</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">確認儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'

const d = new Date()
const selectedMonth = ref(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)

const activeTab = ref('expense')
const viewMode = ref('table')
const expenses = ref([])
const incomes = ref([])
const members = ref([])
const categories = ref([])
const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const dialogTitle = computed(() => {
  return isEdit.value ? '編輯紀錄' : `新增${activeTab.value === 'expense' ? '支出' : '收入'}`
})

const totalExpense = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.amount), 0))
const totalIncome = computed(() => incomes.value.reduce((sum, i) => sum + Number(i.amount), 0))

const pendingExpenses = computed(() => expenses.value.filter(e => e.status !== '已處理'))
const doneExpenses = computed(() => expenses.value.filter(e => e.status === '已處理'))

const form = ref({ id: null, name: '', amount: 1, member_name: '', category_name: '', status: '未處理' })

const fetchDependencies = async () => {
  const [mRes, cRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: true }),
    supabase.from('expense_categories').select('*').order('created_at', { ascending: true })
  ])
  if (mRes.data) members.value = mRes.data
  if (cRes.data) categories.value = cRes.data
}

const fetchData = async () => {
  loading.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'
  
  const [expRes, incRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('year_month', selectedMonth.value).order('created_at', { ascending: false }),
    supabase.from('incomes').select('*').eq('year_month', selectedMonth.value).order('created_at', { ascending: false })
  ])

  if (!expRes.error) expenses.value = expRes.data || []
  if (!incRes.error) incomes.value = incRes.data || []
  
  loading.value = false
}

const importFixedExpenses = async () => {
  try {
    importing.value = true
    const familyId = '00000000-0000-0000-0000-000000000001'

    const [fixedRes, currentRes] = await Promise.all([
      supabase.from('fixed_expenses').select('*'),
      supabase.from('expenses').select('name').eq('year_month', selectedMonth.value)
    ])

    if (fixedRes.error) throw fixedRes.error
    if (!fixedRes.data || fixedRes.data.length === 0) return ElMessage.warning('尚未設定任何固定支出模板')

    const existingNames = currentRes.data.map(e => e.name)
    const toInsert = []

    fixedRes.data.forEach(tpl => {
      if (!existingNames.includes(tpl.name)) {
        toInsert.push({
          family_id: familyId,
          year_month: selectedMonth.value,
          name: tpl.name,
          amount: tpl.amount,
          payer_name: tpl.payer_name,
          category_name: tpl.category_name,
          status: '未處理'
        })
      }
    })

    if (toInsert.length === 0) return ElMessage.info('本月所有固定支出皆已匯入')

    const { error } = await supabase.from('expenses').insert(toInsert)
    if (error) throw error

    ElMessage.success(`✅ 成功匯入 ${toInsert.length} 筆固定支出`)
    fetchData()

  } catch (err) {
    ElMessage.error('匯入失敗：' + err.message)
  } finally {
    importing.value = false
  }
}

const toggleExpenseStatus = async (item) => {
  const newStatus = item.status === '已處理' ? '未處理' : '已處理'
  const { error } = await supabase.from('expenses').update({ status: newStatus }).eq('id', item.id)
  if (error) ElMessage.error('更新失敗：' + error.message)
  else {
    item.status = newStatus
  }
}

const openAddDialog = () => {
  isEdit.value = false
  const defaultMember = members.value.length > 0 ? members.value[0].name : ''
  const defaultCategory = categories.value.length > 0 ? categories.value[0].name : ''
  form.value = { id: null, name: '', amount: 1, member_name: defaultMember, category_name: defaultCategory, status: '未處理' }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    member_name: activeTab.value === 'expense' ? row.payer_name : row.member_name,
    category_name: row.category_name || '',
    status: row.status || '未處理'
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name || form.value.amount <= 0) return ElMessage.warning('請填寫完整資訊')
  if (!form.value.member_name) return ElMessage.warning('請選擇對象')
  
  submitting.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  // 🆕 檢查是否為新分類，若是則自動存檔
  if (activeTab.value === 'expense' && form.value.category_name) {
    const isNewCategory = !categories.value.some(c => c.name === form.value.category_name)
    if (isNewCategory) {
      await supabase.from('expense_categories').insert([{
        family_id: familyId,
        name: form.value.category_name
      }])
      fetchDependencies() // 重新抓取分類
    }
  }
  
  if (activeTab.value === 'expense') {
    const payload = {
      name: form.value.name,
      amount: form.value.amount,
      payer_name: form.value.member_name,
      category_name: form.value.category_name,
      status: form.value.status
    }

    let error
    if (isEdit.value) {
      const res = await supabase.from('expenses').update(payload).eq('id', form.value.id)
      error = res.error
    } else {
      const res = await supabase.from('expenses').insert([{
        ...payload,
        family_id: familyId,
        year_month: selectedMonth.value
      }])
      error = res.error
    }

    if (error) ElMessage.error('儲存失敗：' + error.message)
    else {
      ElMessage.success(isEdit.value ? '✅ 支出已更新' : '✅ 支出已新增')
      dialogVisible.value = false
      fetchData()
    }
  } else {
    const payload = {
      name: form.value.name,
      amount: form.value.amount,
      member_name: form.value.member_name
    }

    let error
    if (isEdit.value) {
      const res = await supabase.from('incomes').update(payload).eq('id', form.value.id)
      error = res.error
    } else {
      const res = await supabase.from('incomes').insert([{
        ...payload,
        family_id: familyId,
        year_month: selectedMonth.value
      }])
      error = res.error
    }

    if (error) ElMessage.error('儲存失敗：' + error.message)
    else {
      ElMessage.success(isEdit.value ? '✅ 收入已更新' : '✅ 收入已新增')
      dialogVisible.value = false
      fetchData()
    }
  }
  submitting.value = false
}

const deleteRecord = async (table, id) => {
  try {
    await ElMessageBox.confirm('確定要刪除這筆紀錄嗎？', '提示', { type: 'warning' })
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
  fetchDependencies()
})
</script>

<style scoped>
/* 樣式同上，保持不變 */
.cashflow-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-left h2 { margin: 0; color: #1e293b; }
.month-picker { width: 140px; }
.header-actions { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
.view-toggle { margin-right: 10px; }

.mb-20 { margin-bottom: 20px; }
.stat-card { border-radius: 8px; background: #f8fafc; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 5px; }
.stat-value { font-size: 20px; font-weight: bold; }
.text-red { color: #ef4444; }
.text-green { color: #10b981; }
.text-muted { color: #94a3b8; text-decoration: line-through; }
.font-bold { font-weight: 600; }
.list-card { border-radius: 8px; border: none; overflow: hidden; }

.tool-bar { margin-bottom: 15px; display: flex; justify-content: flex-end; }

.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

.kanban-wrapper {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 10px;
  min-height: 400px;
}
.kanban-column {
  flex: 1;
  min-width: 280px;
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
}
.kanban-header {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}
.kanban-header.pending { color: #ef4444; border-bottom-color: #fca5a5; }
.kanban-header.done { color: #10b981; border-bottom-color: #6ee7b7; }

.kanban-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.kanban-card {
  border-radius: 6px;
  border: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.kanban-card.done-card { opacity: 0.8; }

.card-title-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-size: 15px; }
.card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: #64748b; }
.card-actions { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px dashed #e2e8f0; padding-top: 10px; }

@media (max-width: 768px) {
  .kanban-wrapper { flex-direction: column; overflow-x: hidden; }
  .kanban-column { min-width: 100%; }
  .view-toggle { width: 100%; display: flex; justify-content: center; }
  .header-actions { width: 100%; justify-content: space-between; }
  .tool-bar { justify-content: center; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/CashflowView.vue
V: 1793811200
W: ai-wa-fs-001
═══ -->