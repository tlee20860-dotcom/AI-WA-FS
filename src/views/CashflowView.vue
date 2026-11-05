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
          style="margin-left: 20px;" 
        />
      </div>
      <el-button type="primary" @click="openAddDialog">+ 新增紀錄</el-button>
    </div>

    <!-- 統計卡片 -->
    <el-row :gutter="20" class="mb-20">
      <el-col :xs="24" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月總支出</div>
          <div class="stat-value text-red">HK$ {{ totalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月總收入</div>
          <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 列表區 -->
    <el-card shadow="never" class="list-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="支出紀錄" name="expense">
          <el-table :data="expenses" style="width: 100%" stripe v-loading="loading">
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
            <el-table-column label="操作" width="80" align="center">
              <template #default="scope">
                <el-button type="danger" text size="small" @click="deleteRecord('expenses', scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="收入紀錄" name="income">
          <el-table :data="incomes" style="width: 100%" stripe v-loading="loading">
            <el-table-column prop="name" label="收入名稱" min-width="150" />
            <el-table-column prop="member_name" label="對象" width="100" />
            <el-table-column prop="amount" label="金額" width="120" align="right">
              <template #default="scope">
                <span class="text-green font-bold">HK$ {{ scope.row.amount.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="scope">
                <el-button type="danger" text size="small" @click="deleteRecord('incomes', scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增彈窗 -->
    <el-dialog v-model="dialogVisible" :title="`新增${activeTab === 'expense' ? '支出' : '收入'}`" width="90%" max-width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="項目名稱" required>
          <el-input v-model="form.name" :placeholder="activeTab === 'expense' ? '例如：買餸、交租' : '例如：薪金、家用轉入'" />
        </el-form-item>
        
        <el-form-item label="金額 (HKD)" required>
          <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="對象" required>
          <el-select v-model="form.member_name" style="width: 100%">
            <el-option label="老公" value="老公" />
            <el-option label="老婆" value="老婆" />
            <el-option label="工人" value="工人" />
            <el-option label="家庭共用" value="家庭共用" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="類別" v-if="activeTab === 'expense'">
          <!-- allow-create 允許你直接輸入新的類別 -->
          <el-select v-model="form.category_name" style="width: 100%" allow-create filterable default-first-option>
            <el-option label="日常飲食" value="日常飲食" />
            <el-option label="交通" value="交通" />
            <el-option label="租金" value="租金" />
            <el-option label="水電煤" value="水電煤" />
            <el-option label="保險" value="保險" />
            <el-option label="雜費" value="雜費" />
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

// 取得當前年月 (預設顯示)
const d = new Date()
const selectedMonth = ref(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)

const activeTab = ref('expense')
const expenses = ref([])
const incomes = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)

// 計算總額
const totalExpense = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.amount), 0))
const totalIncome = computed(() => incomes.value.reduce((sum, i) => sum + Number(i.amount), 0))

const form = ref({
  name: '',
  amount: 1,
  member_name: '家庭共用',
  category_name: '日常飲食',
  status: '未處理'
})

// 獲取資料
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

// 打開彈窗
const openAddDialog = () => {
  form.value = { name: '', amount: 1, member_name: '家庭共用', category_name: '日常飲食', status: '未處理' }
  dialogVisible.value = true
}

// 提交表單
const submitForm = async () => {
  if (!form.value.name || form.value.amount <= 0) return ElMessage.warning('請填寫完整資訊')
  submitting.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'
  
  if (activeTab.value === 'expense') {
    const { error } = await supabase.from('expenses').insert([{
      family_id: familyId,
      year_month: selectedMonth.value,
      name: form.value.name,
      amount: form.value.amount,
      payer_name: form.value.member_name,
      category_name: form.value.category_name,
      status: form.value.status
    }])
    if (error) ElMessage.error('儲存失敗：' + error.message)
    else {
      ElMessage.success('✅ 支出已新增')
      dialogVisible.value = false
      fetchData()
    }
  } else {
    const { error } = await supabase.from('incomes').insert([{
      family_id: familyId,
      year_month: selectedMonth.value,
      name: form.value.name,
      amount: form.value.amount,
      member_name: form.value.member_name
    }])
    if (error) ElMessage.error('儲存失敗：' + error.message)
    else {
      ElMessage.success('✅ 收入已新增')
      dialogVisible.value = false
      fetchData()
    }
  }
  submitting.value = false
}

// 刪除紀錄
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

onMounted(() => fetchData())
</script>

<style scoped>
.cashflow-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; }
.header-left h2 { margin: 0; color: #1e293b; }
.mb-20 { margin-bottom: 20px; }
.stat-card { border-radius: 8px; background: #f8fafc; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 5px; }
.stat-value { font-size: 24px; font-weight: bold; }
.text-red { color: #ef4444; }
.text-green { color: #10b981; }
.font-bold { font-weight: 600; }
.list-card { border-radius: 8px; border: none; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/CashflowView.vue
V: 1793807000
W: ai-wa-fs-001
═══ -->