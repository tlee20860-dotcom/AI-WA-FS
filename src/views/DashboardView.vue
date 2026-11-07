<template>
  <div class="dashboard-container" v-loading="loading">
    <div class="page-header">
      <h2>年度總覽</h2>
      <el-button type="primary" icon="DataLine" class="report-btn" @click="$router.push('/annual-report')">
        查看年度報表
      </el-button>
    </div>

    <!-- 家庭總餘額大卡 -->
    <el-row class="mb-20">
      <el-col :span="24">
        <el-card shadow="never" class="total-balance-card">
          <div class="card-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="card-content">
            <div class="asset-header">
              <div class="asset-label">家庭總餘額</div>
            </div>
            <div class="asset-value" :class="totalBalance < 0 ? 'text-red' : ''">
              HK$ {{ totalBalance.toLocaleString() }}
            </div>
            <div class="asset-sub" v-if="latestBalanceRecord">
              <el-tag size="small" type="success" effect="dark" class="mr-2">基準：{{ latestBalanceRecord.year_month }} 月初</el-tag>
              {{ latestBalanceRecord.year_month }} 基準餘額 + 後續收支推算
            </div>
            <div class="asset-sub text-orange" v-else>
              ⚠️ 尚未設定對帳基準。請至「待辦與紀錄中心」輸入月初實際結餘。
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 年度統計卡片 -->
    <el-row :gutter="20" class="mb-20">
      <el-col :xs="24" :sm="8" class="mb-mobile">
        <el-card shadow="never" class="stat-card income-card">
          <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">{{ currentYear }} 家庭總收入</div>
            <div class="stat-value text-green">HK$ {{ currentYearIncome.toLocaleString() }}</div>
            <div class="stat-sub">家用轉入 + 額外收入</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8" class="mb-mobile">
        <el-card shadow="never" class="stat-card expense-card">
          <div class="stat-icon"><el-icon><Bottom /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">{{ currentYear }} 年度總支出</div>
            <div class="stat-value text-red">HK$ {{ currentYearExpense.toLocaleString() }}</div>
            <div class="stat-sub">{{ activeMonthsCount }} 個月有紀錄</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card balance-card">
          <div class="stat-icon"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">{{ currentYear }} 年度淨餘額</div>
            <div class="stat-value" :class="currentYearNet >= 0 ? 'text-green' : 'text-red'">
              {{ currentYearNet >= 0 ? '+' : '' }} HK$ {{ currentYearNet.toLocaleString() }}
            </div>
            <div class="stat-sub">收支平衡</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 年度總覽表格 -->
    <h3 class="section-title">年度總覽（前後 2 年）</h3>
    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <span class="total-count">共 {{ annualData.length }} 筆</span>
      </div>
      <div class="table-wrapper">
        <el-table :data="annualData" style="width: 100%; min-width: 500px;" stripe default-expand-all>
          <el-table-column prop="year" label="年度" width="140" sortable>
            <template #default="scope">
              <span class="font-bold text-slate-700">{{ scope.row.year }} 年</span>
              <el-tag v-if="scope.row.year === currentYear" size="small" type="primary" class="ml-2" effect="light">今年</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="income" label="家庭收入" align="right" sortable>
            <template #default="scope">
              <span class="text-green font-bold">HK$ {{ scope.row.income.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="expense" label="總支出" align="right" sortable>
            <template #default="scope">
              <span class="text-red font-bold">HK$ {{ scope.row.expense.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="net" label="淨餘額" align="right" sortable>
            <template #default="scope">
              <span :class="scope.row.net >= 0 ? 'text-green' : 'text-red'" class="font-bold">
                {{ scope.row.net >= 0 ? '+' : '' }} HK$ {{ scope.row.net.toLocaleString() }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { TrendCharts, Bottom, Wallet, DataLine, Money } from '@element-plus/icons-vue'

const loading = ref(false)

// 狀態
const latestBalanceRecord = ref(null)
const allTimeIncome = ref(0)
const allTimeExpense = ref(0)
const annualData = ref([])
const activeMonthsCount = ref(0)

const currentYear = new Date().getFullYear()

// 家庭總餘額推算
const totalBalance = computed(() => {
  if (latestBalanceRecord.value) {
    // 有對帳紀錄：以最新輸入的「月初餘額」為基準 + 該月及之後的收入 - 支出
    const baseAmount = Number(latestBalanceRecord.value.actual_balance)
    return baseAmount + allTimeIncome.value - allTimeExpense.value
  } else {
    // 從未對帳過：顯示歷史累計
    return allTimeIncome.value - allTimeExpense.value
  }
})

// 取得當前年度資料
const currentYearData = computed(() => {
  return annualData.value.find(d => d.year === currentYear) || { income: 0, expense: 0, net: 0 }
})

const currentYearIncome = computed(() => currentYearData.value.income)
const currentYearExpense = computed(() => currentYearData.value.expense)
const currentYearNet = computed(() => currentYearData.value.net)

const fetchDashboardData = async () => {
  loading.value = true
  
  try {
    const familyId = '00000000-0000-0000-0000-000000000001'

    // 1. 抓取最新一筆對帳紀錄 (最後一次輸入的月初餘額)
    const { data: balData } = await supabase
      .from('monthly_balances')
      .select('year_month, actual_balance')
      .eq('family_id', familyId)
      .order('year_month', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    latestBalanceRecord.value = balData
    const baseYM = balData ? balData.year_month : '0000-00'

    // 2. 抓取所有收支紀錄
    const [incRes, expRes, insRes, polRes] = await Promise.all([
      supabase.from('incomes').select('year_month, amount'),
      supabase.from('expenses').select('year_month, amount').eq('status', '已處理'),
      supabase.from('insurance_payments').select('year_month, policy_id').eq('status', '已轉'),
      supabase.from('insurance_policies').select('id, monthly_average')
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error

    const policyMap = {}
    if (polRes.data) {
      polRes.data.forEach(p => { policyMap[p.id] = Number(p.monthly_average) })
    }

    // 初始化前後 2 年的資料結構
    const tempYears = {}
    for (let i = -2; i <= 2; i++) {
      const y = currentYear + i
      tempYears[y] = { year: y, income: 0, expense: 0, net: 0 }
    }

    // 重設「基準點之後」的收支累計
    allTimeIncome.value = 0
    allTimeExpense.value = 0

    // 3. 計算收入
    if (incRes.data) {
      incRes.data.forEach(item => {
        if (!item.year_month) return
        const amount = Number(item.amount)
        
        // 只有大於等於基準月份的才計入總餘額推算
        if (item.year_month >= baseYM) {
          allTimeIncome.value += amount
        }
        
        const y = parseInt(item.year_month.split('-')[0])
        if (tempYears[y]) {
          tempYears[y].income += amount
        }
      })
    }

    // 4. 計算一般支出 (已處理)
    const monthsWithData = new Set()
    if (expRes.data) {
      expRes.data.forEach(item => {
        if (!item.year_month) return
        const amount = Number(item.amount)
        
        // 只有大於等於基準月份的才計入總餘額推算
        if (item.year_month >= baseYM) {
          allTimeExpense.value += amount
        }
        
        const y = parseInt(item.year_month.split('-')[0])
        if (tempYears[y]) {
          tempYears[y].expense += amount
          if (y === currentYear) monthsWithData.add(item.year_month)
        }
      })
    }

    // 5. 計算保險支出 (已轉)
    if (insRes.data) {
      insRes.data.forEach(item => {
        if (!item.year_month) return
        const amount = policyMap[item.policy_id] || 0
        
        if (item.year_month >= baseYM) {
          allTimeExpense.value += amount
        }
        
        const y = parseInt(item.year_month.split('-')[0])
        if (tempYears[y]) {
          tempYears[y].expense += amount
          if (y === currentYear) monthsWithData.add(item.year_month)
        }
      })
    }

    // 6. 計算年度淨額並轉為陣列
    const resultArray = []
    for (let i = -2; i <= 2; i++) {
      const y = currentYear + i
      tempYears[y].net = tempYears[y].income - tempYears[y].expense
      resultArray.push(tempYears[y])
    }

    activeMonthsCount.value = monthsWithData.size
    annualData.value = resultArray

  } catch (error) {
    console.error(error)
    ElMessage.error('載入總覽資料失敗')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }
.report-btn { border-radius: 10px; }

.mb-20 { margin-bottom: 24px; }
.mb-mobile { margin-bottom: 16px; }

/* 總餘額大卡 */
.total-balance-card {
  border-radius: 20px;
  border: none;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
}
.total-balance-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  padding: 30px;
}
.card-icon {
  width: 64px; height: 64px;
  border-radius: 16px;
  background: rgba(255,255,255,0.1);
  display: flex; justify-content: center; align-items: center;
  font-size: 32px; margin-right: 24px;
  color: #38bdf8; flex-shrink: 0;
}
.card-content { flex: 1; }
.asset-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.asset-label { font-size: 15px; color: #94a3b8; }
.asset-value { font-size: 36px; font-weight: bold; font-family: monospace; margin-bottom: 6px; }
.asset-value.text-red { color: #f87171; }
.asset-sub { font-size: 13px; color: #64748b; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.asset-sub.text-orange { color: #fb923c; }

/* 統計卡片 */
.stat-card { border-radius: 20px; border: none; position: relative; overflow: hidden; height: 100%; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; padding: 24px; height: 100%; }
.stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; justify-content: center; align-items: center; font-size: 28px; margin-right: 20px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 14px; color: #64748b; margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: bold; white-space: nowrap; margin-bottom: 6px; }
.stat-sub { font-size: 12px; color: #94a3b8; }

.income-card .stat-icon { background: #ecfdf5; color: #10b981; }
.expense-card .stat-icon { background: #fef2f2; color: #ef4444; }
.balance-card .stat-icon { background: #EEF2FF; color: #6366F1; }

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-slate-700 { color: #334155; }
.font-bold { font-weight: 600; }

/* 年度表格 */
.section-title { margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 700; }
.table-card { border-radius: 20px; border: none; overflow: hidden; }
.table-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid #e2e8f0; }
.total-count { font-size: 14px; color: #64748b; }
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

.ml-2 { margin-left: 8px; }
.mr-2 { margin-right: 8px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .report-btn { width: 100%; }
  .asset-value { font-size: 28px; }
  .stat-value { font-size: 20px; }
  .stat-icon { width: 48px; height: 48px; font-size: 24px; margin-right: 16px; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/DashboardView.vue
V: 1793985000
W: ai-wa-fs-002
═══ -->