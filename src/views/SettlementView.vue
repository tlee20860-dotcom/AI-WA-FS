<template>
  <div class="settlement-container">
    <div class="page-header">
      <h2>待辦與紀錄中心</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openAddDialog('expense')">+ 新增支出</el-button>
        <el-button type="success" @click="openAddDialog('income')">+ 新增收入</el-button>
      </div>
    </div>

    <el-card shadow="never" class="main-card">
      <el-tabs v-model="activeTab" class="custom-tabs">
        
        <!-- 1. 收入紀錄 -->
        <el-tab-pane label="收入紀錄" name="income">
          <div class="tab-content">
            <div v-if="rawIncomes.length === 0" class="empty-state">
              <el-empty description="尚無任何收入紀錄" :image-size="80" />
            </div>
            <div v-else class="table-wrapper">
              <el-table :data="rawIncomes" style="width: 100%; min-width: 500px;" stripe>
                <el-table-column prop="year_month" label="月份" width="100" sortable />
                <el-table-column prop="member_name" label="對象" width="120" />
                <el-table-column prop="name" label="收入名稱" min-width="150" />
                <el-table-column prop="amount" label="金額" width="120" align="right">
                  <template #default="scope">
                    <span class="text-green font-bold">HK$ {{ Number(scope.row.amount).toLocaleString() }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120" align="center">
                  <template #default="scope">
                    <el-button type="primary" link size="small" @click="editRecord('income', scope.row)">編輯</el-button>
                    <el-button type="danger" link size="small" @click="deleteRecord('incomes', scope.row.id)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <!-- 2. 支出事項 -->
        <el-tab-pane label="支出事項" name="expense">
          <div class="tab-content">
            <div class="tool-bar">
              <el-button type="warning" plain icon="MagicStick" :loading="importing" @click="importDialogVisible = true">
                一鍵匯入固定支出
              </el-button>
            </div>
            <div v-if="rawExpenses.length === 0" class="empty-state">
              <el-empty description="尚無任何支出紀錄" :image-size="80" />
            </div>
            <div v-else class="table-wrapper">
              <el-table :data="rawExpenses" style="width: 100%; min-width: 600px;" stripe>
                <el-table-column prop="year_month" label="月份" width="100" sortable />
                <el-table-column prop="payer_name" label="對象" width="100" />
                <el-table-column prop="name" label="項目名稱" min-width="150" />
                <el-table-column prop="category_name" label="類別" width="120">
                  <template #default="scope">
                    <el-tag size="small" type="info">{{ scope.row.category_name || '未分類' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="amount" label="金額" width="120" align="right">
                  <template #default="scope">
                    <span class="text-red font-bold">HK$ {{ Number(scope.row.amount).toLocaleString() }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="狀態" width="100" align="center">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '已處理' ? 'success' : 'info'" size="small">{{ scope.row.status || '未處理' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="140" align="center">
                  <template #default="scope">
                    <el-button type="primary" link size="small" @click="editRecord('expense', scope.row)">編輯</el-button>
                    <el-button type="danger" link size="small" @click="deleteRecord('expenses', scope.row.id)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <!-- 3. 待辦事項 -->
        <el-tab-pane label="待辦事項" name="todo">
          <div class="tab-content">
            <div v-if="pendingGroups.length === 0" class="empty-state">
              <el-empty description="目前沒有待辦項目，太棒了！" :image-size="80" />
            </div>
            <div v-else>
              <div class="tool-bar" style="justify-content: space-between; align-items: center;">
                <el-checkbox v-model="checkAll" @change="handleCheckAll">全選</el-checkbox>
                <el-button type="success" :disabled="selectedItems.length === 0" @click="batchProcess" :loading="processing">
                  批量標記已辦 ({{ selectedItems.length }})
                </el-button>
              </div>

              <el-collapse v-model="activePendingCollapse">
                <el-collapse-item v-for="group in pendingGroups" :key="group.month" :name="group.month">
                  <template #title>
                    <div class="group-title">
                      <span class="month-text">{{ group.month }}</span>
                      <span class="month-total text-red">待處理總額: HK$ {{ group.total.toLocaleString() }}</span>
                    </div>
                  </template>
                  
                  <div class="table-wrapper">
                    <el-table :data="group.items" style="width: 100%; min-width: 500px;" stripe size="small">
                      <el-table-column width="50" align="center">
                        <template #default="scope">
                          <el-checkbox-group v-model="selectedItems">
                            <el-checkbox :label="scope.row.id"><span style="display:none">選</span></el-checkbox>
                          </el-checkbox-group>
                        </template>
                      </el-table-column>
                      <el-table-column prop="type" label="類型" width="80">
                        <template #default="scope">
                          <el-tag :type="scope.row.type === 'insurance' ? 'warning' : 'info'" size="small">
                            {{ scope.row.type === 'insurance' ? '保險' : '支出' }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="payer" label="對象" width="100" />
                      <el-table-column prop="name" label="項目名稱" min-width="150" />
                      <el-table-column prop="amount" label="金額" width="120" align="right">
                        <template #default="scope">
                          <span class="text-red font-bold">HK$ {{ scope.row.amount.toLocaleString() }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="80" align="center">
                        <template #default="scope">
                          <el-button type="success" plain size="small" @click="processSingle(scope.row)">完成</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-tab-pane>

        <!-- 4. 已辦事項 -->
        <el-tab-pane label="已辦事項" name="done">
          <div class="tab-content">
            <div v-if="processedGroups.length === 0" class="empty-state">
              <el-empty description="尚無已辦事項" :image-size="80" />
            </div>
            <div v-else>
              <el-collapse v-model="activeDoneCollapse">
                <el-collapse-item v-for="group in processedGroups" :key="group.month" :name="group.month">
                  <template #title>
                    <div class="group-title">
                      <span class="month-text">{{ group.month }}</span>
                      <span class="month-total text-muted">總額: HK$ {{ group.total.toLocaleString() }}</span>
                    </div>
                  </template>
                  
                  <div class="table-wrapper">
                    <el-table :data="group.items" style="width: 100%; min-width: 500px;" stripe size="small">
                      <el-table-column prop="type" label="類型" width="80">
                        <template #default="scope">
                          <el-tag :type="scope.row.type === 'insurance' ? 'warning' : 'info'" size="small">
                            {{ scope.row.type === 'insurance' ? '保險' : '支出' }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="payer" label="對象" width="100" />
                      <el-table-column prop="name" label="項目名稱" min-width="150" />
                      <el-table-column prop="amount" label="金額" width="120" align="right">
                        <template #default="scope">
                          <span class="text-muted" style="text-decoration: line-through;">HK$ {{ scope.row.amount.toLocaleString() }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="80" align="center">
                        <template #default="scope">
                          <el-button type="danger" link size="small" @click="cancelProcess(scope.row)">退回</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
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
          <el-input v-model="form.name" :placeholder="dialogType === 'expense' ? '例如：買餸、交租' : '例如：薪金、家用轉入'" />
        </el-form-item>
        <el-form-item label="金額 (HKD)" required>
          <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="對象" required>
          <el-select v-model="form.member_name" style="width: 100%">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="類別" v-if="dialogType === 'expense'">
          <el-select v-model="form.category_name" style="width: 100%" allow-create filterable default-first-option>
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="狀態" v-if="dialogType === 'expense'">
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

const activeTab = ref('todo')
const loading = ref(false)
const processing = ref(false)
const submitting = ref(false)
const importing = ref(false)

// 原始資料
const rawIncomes = ref([])
const rawExpenses = ref([])
const rawInsurancePayments = ref([])
const policies = ref([])
const members = ref([])
const categories = ref([])

// 勾選與折疊狀態
const selectedItems = ref([])
const checkAll = ref(false)
const activePendingCollapse = ref([])
const activeDoneCollapse = ref([])

// 新增/編輯彈窗狀態
const dialogVisible = ref(false)
const dialogType = ref('expense') // 'expense' | 'income'
const isEdit = ref(false)
const form = ref({ id: null, year_month: '', name: '', amount: 1, member_name: '', category_name: '', status: '未處理' })

// 匯入彈窗狀態
const importDialogVisible = ref(false)
const importMonth = ref(new Date().toISOString().slice(0, 7))

const dialogTitle = computed(() => {
  const typeName = dialogType.value === 'expense' ? '支出' : '收入'
  return isEdit.value ? `編輯${typeName}` : `新增${typeName}`
})

// 🆕 計算期數
const getPeriodNumber = (startDateStr, targetYearMonth) => {
  if (!startDateStr || !targetYearMonth) return ''
  const start = new Date(startDateStr)
  const startY = start.getFullYear()
  const startM = start.getMonth() + 1
  
  const [targetY, targetM] = targetYearMonth.split('-').map(Number)
  
  const diffMonths = (targetY - startY) * 12 + (targetM - startM) + 1
  return diffMonths > 0 ? diffMonths : 1
}

// 轉換為統一的待辦格式
const allPendingItems = computed(() => {
  const items = []
  rawExpenses.value.forEach(e => {
    if (e.status !== '已處理') {
      items.push({
        id: `exp_${e.id}`, realId: e.id, type: 'expense',
        year_month: e.year_month, name: e.name, payer: e.payer_name || '未指定',
        category: e.category_name, amount: Number(e.amount), created_at: e.created_at
      })
    }
  })

  const policyMap = {}
  policies.value.forEach(p => { policyMap[p.id] = p })
  rawInsurancePayments.value.forEach(ip => {
    if (ip.status !== '已轉') {
      const p = policyMap[ip.policy_id]
      if (p) {
        const period = getPeriodNumber(p.start_date, ip.year_month)
        items.push({
          id: `ins_${ip.id}`, realId: ip.id, type: 'insurance',
          year_month: ip.year_month, name: `保險供款：${p.name} (第 ${period} 期)`, payer: p.holder_name || '家庭共用',
          category: '保險', amount: Number(p.monthly_average), created_at: ip.created_at
        })
      }
    }
  })
  return items.sort((a, b) => a.year_month.localeCompare(b.year_month))
})

// 轉換為統一的已辦格式
const allProcessedItems = computed(() => {
  const items = []
  rawExpenses.value.forEach(e => {
    if (e.status === '已處理') {
      items.push({
        id: `exp_${e.id}`, realId: e.id, type: 'expense',
        year_month: e.year_month, name: e.name, payer: e.payer_name || '未指定',
        amount: Number(e.amount)
      })
    }
  })

  const policyMap = {}
  policies.value.forEach(p => { policyMap[p.id] = p })
  rawInsurancePayments.value.forEach(ip => {
    if (ip.status === '已轉') {
      const p = policyMap[ip.policy_id]
      if (p) {
        const period = getPeriodNumber(p.start_date, ip.year_month)
        items.push({
          id: `ins_${ip.id}`, realId: ip.id, type: 'insurance',
          year_month: ip.year_month, name: `保險供款：${p.name} (第 ${period} 期)`, payer: p.holder_name || '家庭共用',
          amount: Number(p.monthly_average)
        })
      }
    }
  })
  return items.sort((a, b) => b.year_month.localeCompare(a.year_month)) // 由新到舊
})

// 分組邏輯
const groupByMonth = (items) => {
  const groups = {}
  items.forEach(item => {
    const m = item.year_month || '未知月份'
    if (!groups[m]) groups[m] = { month: m, total: 0, items: [] }
    groups[m].items.push(item)
    groups[m].total += item.amount
  })
  return Object.values(groups)
}

const pendingGroups = computed(() => groupByMonth(allPendingItems.value).sort((a, b) => a.month.localeCompare(b.month))) // 未辦由舊到新
const processedGroups = computed(() => groupByMonth(allProcessedItems.value)) // 已辦由新到舊

const fetchData = async () => {
  loading.value = true
  try {
    const [incRes, expRes, ipRes, polRes, mRes, cRes] = await Promise.all([
      supabase.from('incomes').select('*').order('year_month', { ascending: false }),
      supabase.from('expenses').select('*').order('year_month', { ascending: false }),
      supabase.from('insurance_payments').select('*'),
      supabase.from('insurance_policies').select('*'),
      supabase.from('members').select('*').order('created_at', { ascending: true }),
      supabase.from('expense_categories').select('*').order('created_at', { ascending: true })
    ])

    if (incRes.data) rawIncomes.value = incRes.data
    if (expRes.data) rawExpenses.value = expRes.data
    if (ipRes.data) rawInsurancePayments.value = ipRes.data
    if (polRes.data) policies.value = polRes.data
    if (mRes.data) members.value = mRes.data
    if (cRes.data) categories.value = cRes.data
  } catch (error) {
    ElMessage.error('載入資料失敗')
  } finally {
    loading.value = false
  }
}

// 全選邏輯
const handleCheckAll = (val) => {
  if (val) {
    selectedItems.value = allPendingItems.value.map(i => i.id)
  } else {
    selectedItems.value = []
  }
}

// 批量處理
const batchProcess = async () => {
  if (selectedItems.value.length === 0) return
  try {
    await ElMessageBox.confirm(`確定要將選中的 ${selectedItems.value.length} 個項目標記為已辦嗎？`, '批量處理', { type: 'success' })
    processing.value = true
    const expenseIds = [], insuranceIds = []
    selectedItems.value.forEach(id => {
      if (id.startsWith('exp_')) expenseIds.push(id.replace('exp_', ''))
      if (id.startsWith('ins_')) insuranceIds.push(id.replace('ins_', ''))
    })

    const promises = []
    if (expenseIds.length > 0) promises.push(supabase.from('expenses').update({ status: '已處理' }).in('id', expenseIds))
    if (insuranceIds.length > 0) promises.push(supabase.from('insurance_payments').update({ status: '已轉' }).in('id', insuranceIds))

    await Promise.all(promises)
    ElMessage.success('✅ 已批量處理')
    selectedItems.value = []
    checkAll.value = false
    fetchData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('處理失敗')
  } finally {
    processing.value = false
  }
}

// 單獨處理
const processSingle = async (item) => {
  try {
    processing.value = true
    if (item.type === 'expense') {
      await supabase.from('expenses').update({ status: '已處理' }).eq('id', item.realId)
    } else {
      await supabase.from('insurance_payments').update({ status: '已轉' }).eq('id', item.realId)
    }
    ElMessage.success('✅ 已完成')
    fetchData()
  } catch (err) {
    ElMessage.error('處理失敗')
  } finally {
    processing.value = false
  }
}

// 退回已辦
const cancelProcess = async (item) => {
  try {
    if (item.type === 'expense') {
      await supabase.from('expenses').update({ status: '未處理' }).eq('id', item.realId)
    } else {
      await supabase.from('insurance_payments').update({ status: '未轉' }).eq('id', item.realId)
    }
    ElMessage.success('已退回未辦')
    fetchData()
  } catch (err) {
    ElMessage.error('退回失敗')
  }
}

// 新增/編輯
const openAddDialog = (type) => {
  dialogType.value = type
  isEdit.value = false
  const defaultMember = members.value.length > 0 ? members.value[0].name : ''
  const defaultCategory = categories.value.length > 0 ? categories.value[0].name : ''
  form.value = { 
    id: null, 
    year_month: new Date().toISOString().slice(0, 7), 
    name: '', 
    amount: 1, 
    member_name: defaultMember, 
    category_name: defaultCategory, 
    status: '未處理' 
  }
  dialogVisible.value = true
}

const editRecord = (type, row) => {
  dialogType.value = type
  isEdit.value = true
  form.value = {
    id: row.id,
    year_month: row.year_month,
    name: row.name,
    amount: row.amount,
    member_name: type === 'expense' ? row.payer_name : row.member_name,
    category_name: row.category_name || '',
    status: row.status || '未處理'
  }
  dialogVisible.value = true
}

const deleteRecord = async (table, id) => {
  try {
    await ElMessageBox.confirm('確定要刪除這筆紀錄嗎？', '警告', { type: 'warning' })
    await supabase.from(table).delete().eq('id', id)
    ElMessage.success('已刪除')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗')
  }
}

const submitForm = async () => {
  if (!form.value.name || form.value.amount <= 0 || !form.value.year_month) return ElMessage.warning('請填寫完整資訊')
  if (!form.value.member_name) return ElMessage.warning('請選擇對象')
  
  submitting.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  if (dialogType.value === 'expense' && form.value.category_name) {
    const isNewCategory = !categories.value.some(c => c.name === form.value.category_name)
    if (isNewCategory) {
      await supabase.from('expense_categories').insert([{ family_id: familyId, name: form.value.category_name }])
    }
  }
  
  if (dialogType.value === 'expense') {
    const payload = {
      year_month: form.value.year_month, name: form.value.name, amount: form.value.amount,
      payer_name: form.value.member_name, category_name: form.value.category_name, status: form.value.status
    }
    if (isEdit.value) await supabase.from('expenses').update(payload).eq('id', form.value.id)
    else await supabase.from('expenses').insert([{ ...payload, family_id: familyId }])
    ElMessage.success(isEdit.value ? '✅ 支出已更新' : '✅ 支出已新增')
  } else {
    const payload = {
      year_month: form.value.year_month, name: form.value.name, amount: form.value.amount, member_name: form.value.member_name
    }
    if (isEdit.value) await supabase.from('incomes').update(payload).eq('id', form.value.id)
    else await supabase.from('incomes').insert([{ ...payload, family_id: familyId }])
    ElMessage.success(isEdit.value ? '✅ 收入已更新' : '✅ 收入已新增')
  }
  
  submitting.value = false
  dialogVisible.value = false
  fetchData()
}

// 匯入固定支出
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
        toInsert.push({ family_id: familyId, year_month: importMonth.value, name: tpl.name, amount: tpl.amount, payer_name: tpl.payer_name, category_name: tpl.category_name, status: '未處理' })
      }
    })
    if (toInsert.length === 0) return ElMessage.info('該月份所有固定支出皆已匯入')

    await supabase.from('expenses').insert(toInsert)
    ElMessage.success(`✅ 成功匯入 ${toInsert.length} 筆固定支出至 ${importMonth.value}`)
    importDialogVisible.value = false
    fetchData()
  } catch (err) {
    ElMessage.error('匯入失敗：' + err.message)
  } finally {
    importing.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.settlement-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }
.header-actions { display: flex; gap: 10px; }

.main-card { border-radius: 20px; border: none; overflow: hidden; }
.tab-content { padding-top: 10px; }
.tool-bar { margin-bottom: 16px; display: flex; justify-content: flex-end; }

/* 表格與折疊樣式 */
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.empty-state { padding: 40px 0; }

:deep(.el-collapse) { border: none; }
:deep(.el-collapse-item__header) {
  background-color: #F8FAFC;
  border-radius: 12px;
  padding: 0 16px;
  margin-bottom: 12px;
  border-bottom: none;
  font-size: 15px;
}
:deep(.el-collapse-item__wrap) { border-bottom: none; background-color: transparent; }
:deep(.el-collapse-item__content) { padding-bottom: 16px; }

.group-title { display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 10px; }
.month-text { font-weight: 700; color: #334155; }
.month-total { font-size: 14px; font-family: monospace; font-weight: 600; }

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 600; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
  .header-actions .el-button { flex: 1; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettlementView.vue
V: 1793975000
W: ai-wa-fs-002
═══ -->