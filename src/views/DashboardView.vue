<template>
  <div class="dashboard-container">
    <div class="page-header">
      <h2>工作台</h2>
      <span class="date-text">{{ currentMonthText }}</span>
    </div>

    <div v-loading="loading">
      <!-- 頂部核心資產看板 -->
      <el-row :gutter="15" class="mb-20">
        <el-col :xs="24" :sm="12">
          <el-card shadow="never" class="total-asset-card">
            <div class="asset-label">家庭當前總資產 (銀行結餘 + 基金)</div>
            <div class="asset-value">HK$ {{ totalAssets.toLocaleString() }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-card shadow="never" class="asset-change-card">
            <div class="asset-label">本月淨資產變化</div>
            <div class="asset-value" :class="(totalIncome - totalExpense) >= 0 ? 'text-green' : 'text-red'">
              {{ (totalIncome - totalExpense) >= 0 ? '+' : '' }} HK$ {{ (totalIncome - totalExpense).toLocaleString() }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 收支與保費統計 -->
      <el-row :gutter="15" class="mb-20">
        <el-col :xs="12" :sm="6">
          <el-card shadow="never" class="stat-card income-card">
            <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本月總收入</div>
              <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="12" :sm="6">
          <el-card shadow="never" class="stat-card expense-card">
            <div class="stat-icon"><el-icon><Bottom /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本月總支出</div>
              <div class="stat-value text-red">HK$ {{ totalExpense.toLocaleString() }}</div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="12" :sm="6">
          <el-card shadow="never" class="stat-card pending-card">
            <div class="stat-icon"><el-icon><Warning /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">待繳保費</div>
              <div class="stat-value text-orange">HK$ {{ pendingInsurance.toLocaleString() }}</div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="12" :sm="6">
          <el-card shadow="never" class="stat-card fund-card">
            <div class="stat-icon"><el-icon><Wallet /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">基金總現值</div>
              <div class="stat-value text-blue">HK$ {{ totalFundValue.toLocaleString() }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="15">
        <!-- 銀行結餘對帳工具 -->
        <el-col :xs="24" :md="12" class="mb-20">
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>本月結餘對帳</span>
                <el-tag v-if="isReconciled" type="success" size="small">✅ 已對帳</el-tag>
                <el-tag v-else type="danger" size="small">⚠️ 未對帳</el-tag>
              </div>
            </template>
            
            <div class="reconcile-box">
              <div class="calc-row">
                <span>上月實際結餘</span>
                <span class="mono">HK$ {{ prevBalance.toLocaleString() }}</span>
              </div>
              <div class="calc-row">
                <span>本月收支淨額</span>
                <span class="mono" :class="(totalIncome - totalExpense) >= 0 ? 'text-green' : 'text-red'">
                  {{ (totalIncome - totalExpense) >= 0 ? '+' : '' }} HK$ {{ (totalIncome - totalExpense).toLocaleString() }}
                </span>
              </div>
              <div class="calc-row highlight">
                <span>系統推算本月結餘</span>
                <span class="mono">HK$ {{ calculatedBalance.toLocaleString() }}</span>
              </div>

              <el-divider style="margin: 12px 0;" />

              <div class="input-row">
                <span class="label">月結單實際結餘：</span>
                <el-input-number v-model="inputActualBalance" :controls="false" style="width: 140px" placeholder="輸入金額" />
                <el-button type="primary" @click="saveActualBalance" :loading="savingBalance">儲存</el-button>
              </div>

              <div class="diff-row" v-if="inputActualBalance > 0">
                <span>差異金額：</span>
                <span :class="Math.abs(inputActualBalance - calculatedBalance) < 1 ? 'text-green font-bold' : 'text-red font-bold'">
                  HK$ {{ Math.abs(inputActualBalance - calculatedBalance).toLocaleString() }}
                </span>
                <span v-if="Math.abs(inputActualBalance - calculatedBalance) >= 1" class="text-muted" style="font-size:12px; margin-left:8px;">(可能有漏記)</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 待處理事項 -->
        <el-col :xs="24" :md="12" class="mb-20">
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>待處理事項</span>
              </div>
            </template>
            <div class="todo-list">
              <div class="todo-item" v-if="pendingInsuranceCount > 0">
                <el-tag type="warning" size="small">保險</el-tag>
                <span>有 {{ pendingInsuranceCount }} 張保單本月尚未轉帳</span>
                <el-button type="primary" link @click="$router.push('/insurance')">去處理</el-button>
              </div>
              <div class="todo-item" v-if="pendingExpenseCount > 0">
                <el-tag type="danger" size="small">收支</el-tag>
                <span>有 {{ pendingExpenseCount }} 筆支出尚未結算</span>
                <el-button type="primary" link @click="$router.push('/settlement')">去處理</el-button>
              </div>
              <el-empty v-if="pendingInsuranceCount === 0 && pendingExpenseCount === 0" description="太棒了！目前沒有待處理事項" :image-size="60" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 🆕 支出類別分析 -->
      <el-row v-if="categoryStats.length > 0">
        <el-col :span="24" class="mb-20">
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>本月支出類別分析</span>
              </div>
            </template>
            <div class="category-list">
              <div class="category-item" v-for="cat in categoryStats" :key="cat.name">
                <div class="cat-header">
                  <span class="cat-name">{{ cat.name }}</span>
                  <span class="cat-amount">HK$ {{ cat.amount.toLocaleString() }} ({{ cat.percent }}%)</span>
                </div>
                <el-progress 
                  :percentage="cat.percent" 
                  :color="cat.color" 
                  :show-text="false" 
                  :stroke-width="10" 
                  style="margin-top: 5px;"
                />
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { TrendCharts, Bottom, Warning, Wallet } from '@element-plus/icons-vue'

const loading = ref(false)
const savingBalance = ref(false)

// 數據狀態
const totalIncome = ref(0)
const totalExpense = ref(0)
const pendingInsurance = ref(0)
const totalFundValue = ref(0)
const pendingInsuranceCount = ref(0)
const pendingExpenseCount = ref(0)

// 對帳狀態
const prevBalance = ref(0)
const actualBalance = ref(0)
const inputActualBalance = ref(0)

// 🆕 分類統計狀態
const categoryStats = ref([])
const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const currentMonthText = computed(() => {
  const d = new Date()
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
})

const currentYearMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const prevYearMonth = computed(() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const totalAssets = computed(() => {
  const bankBalance = actualBalance.value > 0 ? actualBalance.value : calculatedBalance.value
  return bankBalance + totalFundValue.value
})

const calculatedBalance = computed(() => {
  return prevBalance.value + totalIncome.value - totalExpense.value
})

const isReconciled = computed(() => {
  return actualBalance.value > 0 && Math.abs(actualBalance.value - calculatedBalance.value) < 1
})

const fetchDashboardData = async () => {
  loading.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  try {
    // 1. 抓取本月收支 (包含分類)
    const [incRes, expRes] = await Promise.all([
      supabase.from('incomes').select('amount').eq('year_month', currentYearMonth.value),
      supabase.from('expenses').select('amount, status, category_name').eq('year_month', currentYearMonth.value)
    ])

    if (incRes.data) totalIncome.value = incRes.data.reduce((sum, item) => sum + Number(item.amount), 0)
    
    if (expRes.data) {
      totalExpense.value = expRes.data.reduce((sum, item) => sum + Number(item.amount), 0)
      pendingExpenseCount.value = expRes.data.filter(item => item.status !== '已處理').length

      // 🆕 計算分類佔比
      const catMap = {}
      expRes.data.forEach(item => {
        const cName = item.category_name || '未分類'
        if (!catMap[cName]) catMap[cName] = 0
        catMap[cName] += Number(item.amount)
      })

      const sortedCats = Object.entries(catMap)
        .map(([name, amount], index) => ({
          name,
          amount,
          percent: Math.round((amount / totalExpense.value) * 100),
          color: categoryColors[index % categoryColors.length]
        }))
        .sort((a, b) => b.amount - a.amount)

      categoryStats.value = sortedCats
    }

    // 2. 抓取結餘資料
    const [prevRes, currRes] = await Promise.all([
      supabase.from('monthly_balances').select('actual_balance').eq('year_month', prevYearMonth.value).maybeSingle(),
      supabase.from('monthly_balances').select('actual_balance').eq('year_month', currentYearMonth.value).maybeSingle()
    ])

    prevBalance.value = prevRes.data ? Number(prevRes.data.actual_balance) : 0
    if (currRes.data) {
      actualBalance.value = Number(currRes.data.actual_balance)
      inputActualBalance.value = actualBalance.value
    }

    // 3. 抓取本月未轉保險
    const [policiesRes, paymentsRes] = await Promise.all([
      supabase.from('insurance_policies').select('id, monthly_average'),
      supabase.from('insurance_payments').select('policy_id').eq('year_month', currentYearMonth.value).eq('status', '已轉')
    ])

    if (policiesRes.data) {
      const paidPolicyIds = (paymentsRes.data || []).map(p => p.policy_id)
      const unpaidPolicies = policiesRes.data.filter(p => !paidPolicyIds.includes(p.id))
      pendingInsuranceCount.value = unpaidPolicies.length
      pendingInsurance.value = unpaidPolicies.reduce((sum, p) => sum + Number(p.monthly_average), 0)
    }

    // 4. 抓取基金總現值
    const [fundsRes, snapshotsRes] = await Promise.all([
      supabase.from('funds').select('id'),
      supabase.from('fund_snapshots').select('fund_id, total_value_hkd, year_month')
    ])

    if (fundsRes.data && snapshotsRes.data) {
      fundsRes.data.forEach(fund => {
        const fSnaps = snapshotsRes.data.filter(s => s.fund_id === fund.id)
        if (fSnaps.length > 0) {
          fSnaps.sort((a, b) => b.year_month.localeCompare(a.year_month))
          totalFundValue.value += Number(fSnaps[0].total_value_hkd)
        }
      })
    }

  } catch (error) {
    console.error('載入工作台失敗', error)
  } finally {
    loading.value = false
  }
}

const saveActualBalance = async () => {
  if (inputActualBalance.value === null || inputActualBalance.value < 0) return ElMessage.warning('請輸入正確金額')
  
  savingBalance.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  try {
    const { error } = await supabase.from('monthly_balances').upsert({
      family_id: familyId,
      year_month: currentYearMonth.value,
      actual_balance: inputActualBalance.value
    }, { onConflict: 'family_id, year_month' })

    if (error) throw error
    
    actualBalance.value = inputActualBalance.value
    ElMessage.success('✅ 結餘已更新')
    
    if (isReconciled.value) {
      ElMessage.success('🎉 帳目完全相符，太棒了！')
    }
  } catch (err) {
    ElMessage.error('儲存失敗：' + err.message)
  } finally {
    savingBalance.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }
.date-text { font-size: 14px; color: #64748b; font-weight: 500; }

.mb-20 { margin-bottom: 20px; }

/* 總資產卡片 */
.total-asset-card { border-radius: 12px; border: none; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; }
.asset-label { font-size: 14px; color: #94a3b8; margin-bottom: 8px; }
.asset-value { font-size: 28px; font-weight: bold; font-family: monospace; }

.asset-change-card { border-radius: 12px; border: none; background: white; }
.asset-change-card .asset-label { color: #64748b; }
.asset-change-card .asset-value { font-size: 28px; font-family: monospace; }

/* 統計卡片樣式 */
.stat-card { border-radius: 12px; border: none; position: relative; overflow: hidden; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; padding: 20px 15px; }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 24px; margin-right: 15px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: bold; white-space: nowrap; }

/* 各卡片專屬顏色 */
.income-card .stat-icon { background: #ecfdf5; color: #10b981; }
.expense-card .stat-icon { background: #fef2f2; color: #ef4444; }
.pending-card .stat-icon { background: #fffbeb; color: #f59e0b; }
.fund-card .stat-icon { background: #eff6ff; color: #3b82f6; }

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.text-blue { color: #3b82f6; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 600; }
.mono { font-family: 'Courier New', Courier, monospace; font-weight: 600; }

/* 面板樣式 */
.panel-card { border-radius: 12px; border: none; height: 100%; }
.panel-header { font-weight: bold; color: #1e293b; display: flex; justify-content: space-between; align-items: center; }
.todo-list { min-height: 100px; }
.todo-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
.todo-item:last-child { border-bottom: none; }
.todo-item span { flex: 1; color: #475569; }

/* 對帳區樣式 */
.reconcile-box { display: flex; flex-direction: column; gap: 10px; }
.calc-row { display: flex; justify-content: space-between; font-size: 14px; color: #475569; }
.calc-row.highlight { font-weight: bold; color: #1e293b; font-size: 15px; margin-top: 5px; }
.input-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.input-row .label { font-size: 14px; font-weight: bold; color: #334155; }
.diff-row { display: flex; align-items: center; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; }

/* 🆕 分類分析樣式 */
.category-list { display: flex; flex-direction: column; gap: 15px; }
.category-item { display: flex; flex-direction: column; }
.cat-header { display: flex; justify-content: space-between; font-size: 14px; color: #334155; font-weight: 500; }
.cat-amount { font-family: monospace; }

/* 手機端優化 */
@media (max-width: 768px) {
  .asset-value { font-size: 24px; }
  .stat-value { font-size: 15px; }
  .stat-icon { width: 36px; height: 36px; font-size: 18px; margin-right: 10px; }
  .input-row { flex-direction: column; align-items: stretch; }
  .input-row .el-input-number { width: 100% !important; margin-bottom: 10px; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/DashboardView.vue
V: 1793811300
W: ai-wa-fs-001
═══ -->