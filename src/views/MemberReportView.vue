<template>
  <div class="member-report-container">
    <div class="page-header">
      <div class="header-left">
        <h2>成員收支明細</h2>
        <el-date-picker 
          v-model="selectedMonth" 
          type="month" 
          placeholder="選擇月份" 
          value-format="YYYY-MM" 
          @change="fetchData" 
          class="month-picker"
        />
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>

    <el-empty v-else-if="members.length === 0" description="尚無家庭成員，請先至系統設定新增。" />

    <div v-else class="member-grid">
      <el-card v-for="member in memberStats" :key="member.name" shadow="hover" class="member-card">
        <div class="card-header">
          <h3 class="member-name" @click="openExpenseDialog(member.name)">
            {{ member.name }}
            <span class="click-hint">點擊看支出明細</span>
          </h3>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <span class="label">家用轉入</span>
            <span class="value text-green">HK$ {{ member.householdIncome.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">個人收入</span>
            <span class="value text-green">HK$ {{ member.personalIncome.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">一般支出</span>
            <span class="value text-red">HK$ {{ member.expense.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">保險平攤</span>
            <span class="value text-orange">HK$ {{ member.insurance.toLocaleString() }}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="info-row net-row">
            <span class="label font-bold">淨結餘</span>
            <span class="value font-bold" :class="member.net >= 0 ? 'text-green' : 'text-red'">
              {{ member.net >= 0 ? '+' : '' }} HK$ {{ member.net.toLocaleString() }}
            </span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 支出明細彈窗 -->
    <el-dialog 
      v-model="expenseDialogVisible" 
      :title="`${currentMemberName} 的支出明細 (${selectedMonth})`" 
      width="90%" 
      max-width="600px"
    >
      <div v-if="currentMemberExpenses.length === 0" class="empty-dialog">
        <el-empty description="該成員本月沒有一般支出紀錄" :image-size="60" />
      </div>
      <div v-else class="table-wrapper">
        <el-table :data="currentMemberExpenses" style="width: 100%; min-width: 500px;" stripe size="small">
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
          <el-table-column prop="created_at" label="輸入日期" width="110" align="center">
            <template #default="scope">
              <span class="text-muted text-sm">{{ formatDate(scope.row.created_at) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button type="primary" @click="expenseDialogVisible = false">關閉</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const loading = ref(false)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

// 原始資料
const members = ref([])
const rawIncomes = ref([])
const rawExpenses = ref([])
const policies = ref([])

// 彈窗狀態
const expenseDialogVisible = ref(false)
const currentMemberName = ref('')
const currentMemberExpenses = ref([])

// 格式化日期
const formatDate = (datetime) => {
  if (!datetime) return '-'
  return datetime.split('T')[0]
}

// 計算每位成員的統計
const memberStats = computed(() => {
  if (members.value.length === 0) return []

  return members.value.map(member => {
    const mName = member.name

    // 1. 收入 (區分家用與個人)
    let householdIncome = 0
    let personalIncome = 0
    
    rawIncomes.value.forEach(inc => {
      if (inc.member_name === mName) {
        const amount = Number(inc.amount)
        if (inc.name && inc.name.includes('家用')) {
          householdIncome += amount
        } else {
          personalIncome += amount
        }
      }
    })

    // 2. 一般支出 (已處理)
    let expense = 0
    rawExpenses.value.forEach(exp => {
      if (exp.payer_name === mName) {
        expense += Number(exp.amount)
      }
    })

    // 3. 保險平攤 (名下保單的月均總和)
    let insurance = 0
    policies.value.forEach(p => {
      if (p.holder_name === mName) {
        insurance += Number(p.monthly_average)
      }
    })

    // 4. 淨結餘
    const net = (householdIncome + personalIncome) - (expense + insurance)

    return {
      name: mName,
      householdIncome,
      personalIncome,
      expense,
      insurance,
      net
    }
  })
})

const fetchData = async () => {
  if (!selectedMonth.value) return
  loading.value = true

  try {
    // 抓取成員
    const mRes = await supabase.from('members').select('*').order('created_at', { ascending: true })
    if (mRes.data) members.value = mRes.data

    // 抓取該月收入
    const incRes = await supabase.from('incomes').select('*').eq('year_month', selectedMonth.value)
    if (incRes.data) rawIncomes.value = incRes.data

    // 抓取該月支出 (僅已處理)
    const expRes = await supabase.from('expenses').select('*').eq('year_month', selectedMonth.value).eq('status', '已處理')
    if (expRes.data) rawExpenses.value = expRes.data

    // 抓取所有保單
    const polRes = await supabase.from('insurance_policies').select('*')
    if (polRes.data) policies.value = polRes.data

  } catch (error) {
    console.error(error)
    ElMessage.error('載入成員收支資料失敗')
  } finally {
    loading.value = false
  }
}

// 開啟支出明細彈窗
const openExpenseDialog = (memberName) => {
  currentMemberName.value = memberName
  // 過濾出該成員在該月的支出
  currentMemberExpenses.value = rawExpenses.value
    .filter(exp => exp.payer_name === memberName)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  expenseDialogVisible.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.member-report-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
.header-left h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }
.month-picker { width: 140px; }

/* 網格佈局 */
.member-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .member-grid { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1024px) {
  .member-grid { grid-template-columns: repeat(3, 1fr); }
}

/* 卡片樣式 */
.member-card { 
  border-radius: 20px; 
  border: none; 
  background: #ffffff; 
  box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}
.member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08) !important;
}
.member-card :deep(.el-card__body) {
  padding: 24px;
}
.card-header {
  margin-bottom: 16px;
}
.member-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #6366F1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s;
}
.member-name:hover {
  color: #4F46E5;
  text-decoration: underline;
}
.click-hint {
  font-size: 12px;
  font-weight: normal;
  color: #94a3b8;
  text-decoration: none !important;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}
.label {
  color: #64748b;
}
.value {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
}

.divider {
  height: 1px;
  background-color: #f1f5f9;
  margin: 4px 0;
}

.net-row {
  margin-top: 4px;
}
.net-row .label {
  color: #1e293b;
}

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }
.text-sm { font-size: 13px; }

/* 彈窗內表格 */
.table-wrapper { width: 100%; overflow-x: auto; }
.empty-dialog { padding: 20px 0; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-left { width: 100%; justify-content: space-between; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/MemberReportView.vue
V: 1794007000
W: ai-wa-fs-002
═══ -->