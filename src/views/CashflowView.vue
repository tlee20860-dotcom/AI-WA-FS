<template>
  <div class="cashflow-container">
    <div class="page-header">
      <h2>收支流水</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openAddDialog">+ 新增紀錄</el-button>
      </div>
    </div>

    <!-- 統計卡片 (顯示所有歷史總和) -->
    <el-row :gutter="20" class="mb-20">
      <el-col :xs="12" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">總支出</div>
          <div class="stat-value text-red">HK$ {{ totalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">總收入</div>
          <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 資料顯示區 -->
    <el-card shadow="never" class="list-card">
      <el-tabs v-model="activeTab">
        <!-- 支出紀錄 -->
        <el-tab-pane label="支出紀錄" name="expense">
          <div class="tool-bar">
            <el-button type="warning" plain icon="MagicStick" :loading="importing" @click="importFixedExpenses">
              一鍵匯入固定支出
            </el-button>
          </div>

          <div v-if="expenses.length === 0" class="empty-state">
            <el-empty description="尚無任何支出紀錄" :image-size="80" />
          </div>

          <div v-else class="month-groups">
            <el-collapse v-model="activeExpenseMonths">
              <el-collapse-item 
                v-for="group in groupedExpenses" 
                :key="group.month" 
                :name="group.month"
              >
                <template #title>
                  <div class="group-title">
                    <span class="month-text">{{ group.month }}</span>
                    <span class="month-total text-red">總支出: HK$ {{ group.total.toLocaleString() }}</span>
                  </div>
                </template>
                
                <div class="table-wrapper">
                  <el-table :data="group.items" style="width: 100%; min-width: 600px;" stripe>
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
                          {{ scope.row.status === '已處理' ? '取消' : '標記處理' }}
                        </el-button>
                        <el-button type="primary" link size="small" @click="openEditDialog(scope.row)">編輯</el-button>
                        <el-button type="danger" text size="small" @click="deleteRecord('expenses', scope.row.id)">刪除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-tab-pane>
        
        <!-- 收入紀錄 -->
        <el-tab-pane label="收入紀錄" name="income">
          <div v-if="incomes.length === 0" class="empty-state">
            <el-empty description="尚無任何收入紀錄" :image-size="80" />
          </div>

          <div v-else class="month-groups">
            <el-collapse v-model="activeIncomeMonths">
              <el-collapse-item 
                v-for="group in groupedIncomes" 
                :key="group.month" 
                :name="group.month"
              >
                <template #title>
                  <div class="group-title">
                    <span class="month-text">{{ group.month }}</span>
                    <span class="month-total text-green">總收入: HK$ {{ group.total.toLocaleString() }}</span>
                  </div>
                </template>
                
                <div class="table-wrapper">
                  <el-table :data="group.items" style="width: 100%; min-width: 400px;" stripe>
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
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增/編輯彈窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" max-width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="紀錄月份" required>
          <el-date-picker v-model="form.year_month" type="month" placeholder="選擇月份" value-format="YYYY-MM" style="width: 100%" />
        </el-form-item>
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

    <!-- 匯入固定支出彈窗 -->
    <el-dialog v-model="importDialogVisible" title="匯入固定支出" width="90%" max-width="400px">
      <el-form label-position="top">
        <div class="preview-box" style="margin-bottom: 15px; background: #fffbeb; color: #d97706;">
          將為指定月份匯入設定好的固定支出模板。
        </div>
        <el-form-item label="選擇要匯入的月份" required>
          <el-date-picker v-model="importMonth" type="month" placeholder="選擇月份" value-format="YYYY-MM" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="executeImport">確認匯入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'

const activeTab = ref('expense')
const expenses = ref([])
const incomes = ref([])
const members = ref([])
const categories = ref([])
const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)

// 彈窗狀態
const dialogVisible = ref(false)
const isEdit = ref(false)

// 折疊面板展開狀態 (預設展開最近的兩個月)
const activeExpenseMonths = ref([])
const activeIncomeMonths = ref([])

// 匯入彈窗狀態
const importDialogVisible = ref(false)
const importMonth = ref(new Date().toISOString().slice(0, 7))

const dialogTitle = computed(() => {
  return isEdit.value ? '編輯紀錄' : `新增${activeTab.value === 'expense' ? '支出' : '收入'}`
})

const totalExpense = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.amount), 0))
const totalIncome = computed(() => incomes.value.reduce((sum, i) => sum + Number(i.amount), 0))

// 分組邏輯
const groupData = (data, amountKey) => {
  const groups = {}
  data.forEach(item => {
    const m = item.year_month || '未知月份'
    if (!groups[m]) {
      groups[m] = { month: m, total: 0, items: [] }
    }
    groups[m].items.push(item)
    groups[m].total += Number(item[amountKey])
  })
  // 轉為陣列並按月份倒序
  return Object.values(groups).sort((a, b) => b.month.localeCompare(a.month))
}

const groupedExpenses = computed(() => groupData(expenses.value, 'amount'))
const groupedIncomes = computed(() => groupData(incomes.value, 'amount'))

const form = ref({ id: null, year_month: '', name: '', amount: 1, member_name: '', category_name: '', status: '未處理' })

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
  
  const [expRes, incRes] = await Promise.all([
    supabase.from('expenses').select('*').order('year_month', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('incomes').select('*').order('year_month', { ascending: false }).order('created_at', { ascending: false })
  ])

  if (!expRes.error) expenses.value = expRes.data || []
  if (!incRes.error) incomes.value = incRes.data || []
  
  // 預設展開前 2 個月
  if (activeExpenseMonths.value.length === 0 && groupedExpenses.value.length > 0) {
    activeExpenseMonths.value = groupedExpenses.value.slice(0, 2).map(g => g.month)
  }
  if (activeIncomeMonths.value.length === 0 && groupedIncomes.value.length > 0) {
    activeIncomeMonths.value = groupedIncomes.value.slice(0, 2).map(g => g.month)
  }
  
  loading.value = false
}

const importFixedExpenses = () => {
  importMonth.value = new Date().toISOString().slice(0, 7)
  importDialogVisible.value = true
}

const executeImport = async () => {
  if (!importMonth.value) return ElMessage.warning('請選擇月份')
  
  try {
    importing.value = true
    const familyId = '00000000-0000-0000-0000-000000000001'

    const [fixedRes, currentRes] = await Promise.all([
      supabase.from('fixed_expenses').select('*'),
      supabase.from('expenses').select('name').eq('year_month', importMonth.value)
    ])

    if (fixedRes.error) throw fixedRes.error
    if (!fixedRes.data || fixedRes.data.length === 0) return ElMessage.warning('尚未設定任何固定支出模板')

    const existingNames = currentRes.data.map(e => e.name)
    const toInsert = []

    fixedRes.data.forEach(tpl => {
      if (!existingNames.includes(tpl.name)) {
        toInsert.push({
          family_id: familyId,
          year_month: importMonth.value,
          name: tpl.name,
          amount: tpl.amount,
          payer_name: tpl.payer_name,
          category_name: tpl.category_name,
          status: '未處理'
        })
      }
    })

    if (toInsert.length === 0) return ElMessage.info('該月份所有固定支出皆已匯入')

    const { error } = await supabase.from('expenses').insert(toInsert)
    if (error) throw error

    ElMessage.success(`✅ 成功匯入 ${toInsert.length} 筆固定支出至 ${importMonth.value}`)
    importDialogVisible.value = false
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
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  form.value = { 
    id: null, 
    year_month: currentMonth, 
    name: '', 
    amount: 1, 
    member_name: defaultMember, 
    category_name: defaultCategory, 
    status: '未處理' 
  }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    year_month: row.year_month,
    name: row.name,
    amount: row.amount,
    member_name: activeTab.value === 'expense' ? row.payer_name : row.member_name,
    category_name: row.category_name || '',
    status: row.status || '未處理'
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name || form.value.amount <= 0 || !form.value.year_month) return ElMessage.warning('請填寫完整資訊')
  if (!form.value.member_name) return ElMessage.warning('請選擇對象')
  
  submitting.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  // 檢查是否為新分類，若是則自動存檔
  if (activeTab.value === 'expense' && form.value.category_name) {
    const isNewCategory = !categories.value.some(c => c.name === form.value.category_name)
    if (isNewCategory) {
      await supabase.from('expense_categories').insert([{
        family_id: familyId,
        name: form.value.category_name
      }])
      fetchDependencies()
    }
  }
  
  if (activeTab.value === 'expense') {
    const payload = {
      year_month: form.value.year_month,
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
        family_id: familyId
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
      year_month: form.value.year_month,
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
        family_id: familyId
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
.cashflow-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }

.mb-20 { margin-bottom: 24px; }
.stat-card { border-radius: 20px; background: #ffffff; border: none; }
.stat-label { font-size: 14px; color: #64748b; margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: bold; }
.text-red { color: #ef4444; }
.text-green { color: #10b981; }
.font-bold { font-weight: 600; }

.list-card { border-radius: 20px; border: none; overflow: hidden; }
.tool-bar { margin-bottom: 20px; display: flex; justify-content: flex-end; }

/* 折疊面板樣式 */
.month-groups :deep(.el-collapse) {
  border: none;
}
.month-groups :deep(.el-collapse-item__header) {
  background-color: #F8FAFC;
  border-radius: 12px;
  padding: 0 16px;
  margin-bottom: 12px;
  border-bottom: none;
  font-size: 15px;
}
.month-groups :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background-color: transparent;
}
.month-groups :deep(.el-collapse-item__content) {
  padding-bottom: 16px;
}
.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 10px;
}
.month-text { font-weight: 700; color: #334155; }
.month-total { font-size: 13px; font-family: monospace; }

.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.empty-state { padding: 40px 0; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-actions { width: 100%; }
  .header-actions .el-button { width: 100%; }
  .tool-bar { justify-content: center; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/CashflowView.vue
V: 1793971300
W: ai-wa-fs-002
═══ -->