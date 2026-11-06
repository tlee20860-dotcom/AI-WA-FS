<template>
  <div class="settlement-container">
    <div class="page-header">
      <h2>待辦中心</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openAddExpenseDialog">+ 新增支出</el-button>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>

    <el-empty v-else-if="pendingGroups.length === 0 && doneItems.length === 0" description="目前沒有待辦項目，太棒了！" />

    <div v-else class="content-wrapper">
      <!-- 未辦事項區塊 -->
      <div v-if="pendingGroups.length > 0" class="pending-section">
        <div class="section-header">
          <h3>⏳ 未辦事項</h3>
          <div class="bulk-actions">
            <el-checkbox v-model="checkAll" @change="handleCheckAll" class="mr-2">全選</el-checkbox>
            <el-button type="success" :disabled="selectedItems.length === 0" @click="batchProcess" :loading="processing">
              批量標記已辦 ({{ selectedItems.length }})
            </el-button>
          </div>
        </div>

        <div class="groups-list">
          <el-card v-for="group in pendingGroups" :key="group.month" shadow="never" class="month-card">
            <template #header>
              <div class="month-header">
                <span class="month-title">{{ group.month }}</span>
                <span class="month-total text-red">待處理總額: HK$ {{ group.total.toLocaleString() }}</span>
              </div>
            </template>
            
            <div class="items-list">
              <div v-for="item in group.items" :key="item.id" class="todo-item">
                <div class="item-checkbox">
                  <el-checkbox-group v-model="selectedItems">
                    <el-checkbox :label="item.id">
                      <span style="display:none">選中</span>
                    </el-checkbox>
                  </el-checkbox-group>
                </div>
                <div class="item-info">
                  <div class="item-main">
                    <el-tag :type="item.type === 'insurance' ? 'warning' : 'info'" size="small" class="mr-2">
                      {{ item.type === 'insurance' ? '保險' : '支出' }}
                    </el-tag>
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-category" v-if="item.category">({{ item.category }})</span>
                  </div>
                  <div class="item-sub">
                    對象：{{ item.payer }} | 金額：<strong>HK$ {{ item.amount.toLocaleString() }}</strong>
                  </div>
                </div>
                <div class="item-actions">
                  <!-- 單獨處理按鈕 (可選) -->
                  <el-button type="success" plain size="small" @click="processSingle(item)">完成</el-button>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 已辦事項區塊 -->
      <div v-if="doneItems.length > 0" class="done-section">
        <el-collapse v-model="activeDoneCollapse">
          <el-collapse-item name="done">
            <template #title>
              <h3 class="done-title">✅ 已辦事項 ({{ doneItems.length }})</h3>
            </template>
            <div class="table-wrapper">
              <el-table :data="doneItems" style="width: 100%; min-width: 500px;" stripe size="small">
                <el-table-column prop="year_month" label="月份" width="100" />
                <el-table-column prop="type" label="類型" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.type === 'insurance' ? 'warning' : 'info'" size="small">
                      {{ scope.row.type === 'insurance' ? '保險' : '支出' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名稱" min-width="150" />
                <el-table-column prop="payer" label="對象" width="100" />
                <el-table-column prop="amount" label="金額" width="120" align="right">
                  <template #default="scope">
                    <span class="text-muted">HK$ {{ scope.row.amount.toLocaleString() }}</span>
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

    <!-- 新增支出彈窗 -->
    <el-dialog v-model="dialogVisible" title="新增支出" width="90%" max-width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="紀錄月份" required>
          <el-date-picker v-model="form.year_month" type="month" placeholder="選擇月份" value-format="YYYY-MM" style="width: 100%" />
        </el-form-item>
        <el-form-item label="項目名稱" required>
          <el-input v-model="form.name" placeholder="例如：買餸、交租" />
        </el-form-item>
        <el-form-item label="金額 (HKD)" required>
          <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="對象" required>
          <el-select v-model="form.member_name" style="width: 100%">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="類別" required>
          <el-select v-model="form.category_name" style="width: 100%" allow-create filterable default-first-option>
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
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
import { Loading } from '@element-plus/icons-vue'

const loading = ref(false)
const processing = ref(false)
const submitting = ref(false)

// 資料狀態
const rawExpenses = ref([])
const rawInsurancePayments = ref([])
const policies = ref([])
const members = ref([])
const categories = ref([])

// 勾選與折疊狀態
const selectedItems = ref([])
const checkAll = ref(false)
const activeDoneCollapse = ref([])

// 彈窗狀態
const dialogVisible = ref(false)
const form = ref({ year_month: '', name: '', amount: 1, member_name: '', category_name: '' })

// 轉換為統一的待辦格式
const allPendingItems = computed(() => {
  const items = []

  // 處理一般支出 (跨月，status = '未處理')
  rawExpenses.value.forEach(e => {
    if (e.status !== '已處理') {
      items.push({
        id: `exp_${e.id}`,
        realId: e.id,
        type: 'expense',
        year_month: e.year_month,
        name: e.name,
        payer: e.payer_name || '未指定',
        category: e.category_name,
        amount: Number(e.amount),
        created_at: e.created_at
      })
    }
  })

  // 處理保險 (跨月，status = '未轉')
  const policyMap = {}
  policies.value.forEach(p => { policyMap[p.id] = p })
  
  rawInsurancePayments.value.forEach(ip => {
    if (ip.status !== '已轉') {
      const p = policyMap[ip.policy_id]
      if (p) {
        items.push({
          id: `ins_${ip.id}`,
          realId: ip.id,
          type: 'insurance',
          year_month: ip.year_month,
          name: `保險供款：${p.name}`,
          payer: p.holder_name || '家庭共用', // 🆕 改為讀取持有人
          category: '保險',
          amount: Number(p.monthly_average),
          created_at: ip.created_at
        })
      }
    }
  })

  // 按年月由舊到新排序
  return items.sort((a, b) => a.year_month.localeCompare(b.year_month))
})

// 已辦事項 (只顯示最近一個月的，避免太長)
const doneItems = computed(() => {
  const items = []
  
  rawExpenses.value.forEach(e => {
    if (e.status === '已處理') {
      items.push({
        id: `exp_${e.id}`,
        realId: e.id,
        type: 'expense',
        year_month: e.year_month,
        name: e.name,
        payer: e.payer_name || '未指定',
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
        items.push({
          id: `ins_${ip.id}`,
          realId: ip.id,
          type: 'insurance',
          year_month: ip.year_month,
          name: `保險供款：${p.name}`,
          payer: p.holder_name || '家庭共用', // 🆕 改為讀取持有人
          amount: Number(p.monthly_average)
        })
      }
    }
  })
  // 由新到舊
  return items.sort((a, b) => b.year_month.localeCompare(a.year_month))
})

// 未辦事項分組
const pendingGroups = computed(() => {
  const groups = {}
  allPendingItems.value.forEach(item => {
    const m = item.year_month || '未知月份'
    if (!groups[m]) {
      groups[m] = { month: m, total: 0, items: [] }
    }
    groups[m].items.push(item)
    groups[m].total += item.amount
  })
  return Object.values(groups)
})

// 載入資料
const fetchData = async () => {
  loading.value = true
  
  try {
    const [expRes, ipRes, polRes, mRes, cRes] = await Promise.all([
      supabase.from('expenses').select('*'),
      supabase.from('insurance_payments').select('*'),
      supabase.from('insurance_policies').select('*'),
      supabase.from('members').select('*').order('created_at', { ascending: true }),
      supabase.from('expense_categories').select('*').order('created_at', { ascending: true })
    ])

    if (expRes.data) rawExpenses.value = expRes.data
    if (ipRes.data) rawInsurancePayments.value = ipRes.data
    if (polRes.data) policies.value = polRes.data
    if (mRes.data) members.value = mRes.data
    if (cRes.data) categories.value = cRes.data

  } catch (error) {
    ElMessage.error('載入待辦資料失敗')
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

    const expenseIds = []
    const insuranceIds = []

    selectedItems.value.forEach(id => {
      if (id.startsWith('exp_')) expenseIds.push(id.replace('exp_', ''))
      if (id.startsWith('ins_')) insuranceIds.push(id.replace('ins_', ''))
    })

    const promises = []
    if (expenseIds.length > 0) {
      promises.push(supabase.from('expenses').update({ status: '已處理' }).in('id', expenseIds))
    }
    if (insuranceIds.length > 0) {
      promises.push(supabase.from('insurance_payments').update({ status: '已轉' }).in('id', insuranceIds))
    }

    await Promise.all(promises)

    ElMessage.success('✅ 已批量處理')
    selectedItems.value = []
    checkAll.value = false
    fetchData()

  } catch (err) {
    if (err !== 'cancel') ElMessage.error('處理失敗：' + err.message)
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

// 新增支出
const openAddExpenseDialog = () => {
  const defaultMember = members.value.length > 0 ? members.value[0].name : ''
  const defaultCategory = categories.value.length > 0 ? categories.value[0].name : ''
  form.value = { 
    year_month: new Date().toISOString().slice(0, 7), 
    name: '', 
    amount: 1, 
    member_name: defaultMember, 
    category_name: defaultCategory 
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name || form.value.amount <= 0 || !form.value.year_month) return ElMessage.warning('請填寫完整資訊')
  if (!form.value.member_name) return ElMessage.warning('請選擇對象')
  
  submitting.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  // 自動存檔新分類
  if (form.value.category_name) {
    const isNewCategory = !categories.value.some(c => c.name === form.value.category_name)
    if (isNewCategory) {
      await supabase.from('expense_categories').insert([{ family_id: familyId, name: form.value.category_name }])
      fetchData()
    }
  }
  
  const payload = {
    family_id: familyId,
    year_month: form.value.year_month,
    name: form.value.name,
    amount: form.value.amount,
    payer_name: form.value.member_name,
    category_name: form.value.category_name,
    status: '未處理'
  }

  const { error } = await supabase.from('expenses').insert([payload])
  
  submitting.value = false
  if (error) {
    ElMessage.error('儲存失敗：' + error.message)
  } else {
    ElMessage.success('✅ 支出已新增')
    dialogVisible.value = false
    fetchData()
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.settlement-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }

.content-wrapper { display: flex; flex-direction: column; gap: 24px; }

/* 未辦事項區塊 */
.pending-section { width: 100%; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { margin: 0; font-size: 18px; color: #334155; }
.bulk-actions { display: flex; align-items: center; }

.groups-list { display: flex; flex-direction: column; gap: 16px; }

.month-card { border-radius: 16px; border: 1px solid rgba(0,0,0,0.03); }
.month-card :deep(.el-card__header) { background-color: #F8FAFC; padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
.month-header { display: flex; justify-content: space-between; align-items: center; }
.month-title { font-weight: 700; color: #1e293b; font-size: 16px; }
.month-total { font-size: 14px; font-family: monospace; font-weight: 600; }

.items-list { display: flex; flex-direction: column; gap: 8px; }
.todo-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid #f1f5f9; transition: background 0.2s; }
.todo-item:hover { background: #F8FAFC; }

.item-checkbox { flex-shrink: 0; }
.item-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.item-main { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #1e293b; font-size: 15px; }
.item-name { font-weight: 700; }
.item-category { font-size: 13px; color: #64748b; font-weight: normal; }
.item-sub { font-size: 13px; color: #64748b; }
.item-actions { flex-shrink: 0; }

.mr-2 { margin-right: 12px; }
.text-red { color: #ef4444; }

/* 已辦事項區塊 */
.done-section { margin-top: 20px; background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.03); padding: 0 20px; }
.done-title { font-size: 16px; color: #334155; margin: 0; padding: 4px 0; }
.table-wrapper { width: 100%; overflow-x: auto; }
.text-muted { color: #94a3b8; text-decoration: line-through; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-actions { width: 100%; }
  .header-actions .el-button { width: 100%; }
  .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .bulk-actions { width: 100%; justify-content: space-between; }
  .todo-item { flex-wrap: wrap; }
  .item-actions { width: 100%; text-align: right; margin-top: 8px; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettlementView.vue
V: 1793972200
W: ai-wa-fs-002
═══ -->