<template>
  <div class="cashflow-container">
    <div class="page-header">
      <div class="header-left">
        <h2>月度總覽</h2>
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

    <div v-loading="loading">
      <!-- 統計卡片 -->
      <div class="dashboard-grid">
        <!-- 1. 本月總收入 -->
        <el-card shadow="never" class="stat-card income-card">
          <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">本月總收入</div>
            <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
          </div>
        </el-card>

        <!-- 2. 普通支出 -->
        <el-card shadow="never" class="stat-card expense-card">
          <div class="stat-icon"><el-icon><Bottom /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">普通支出</div>
            <div class="stat-value text-red">HK$ {{ processedExpense.toLocaleString() }}</div>
            <div class="stat-sub">
              待處理：<span class="text-orange">HK$ {{ pendingExpense.toLocaleString() }}</span>
            </div>
          </div>
        </el-card>

        <!-- 3. 保險支出 -->
        <el-card shadow="never" class="stat-card insurance-card">
          <div class="stat-icon"><el-icon><Umbrella /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">保險供款</div>
            <div class="stat-value text-orange">HK$ {{ processedInsurance.toLocaleString() }}</div>
            <div class="stat-sub">
              待轉帳：<span class="text-muted">HK$ {{ pendingInsurance.toLocaleString() }}</span>
            </div>
          </div>
        </el-card>

        <!-- 4. 本月實際總支出 -->
        <el-card shadow="never" class="stat-card total-card">
          <div class="stat-icon"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">本月實際總支出</div>
            <div class="stat-value text-primary">HK$ {{ totalProcessed.toLocaleString() }}</div>
            <div class="stat-sub">
              (普通支出 + 保險供款)
            </div>
          </div>
        </el-card>
      </div>

      <!-- 🆕 銀行對帳區塊 -->
      <el-card shadow="never" class="reconcile-card">
        <div class="reconcile-content">
          <div class="reconcile-info">
            <h3>本月銀行對帳</h3>
            <p>輸入該月真實的銀行總結餘，系統將以此為基準推算未來的家庭總資產。</p>
          </div>
          <div class="reconcile-input">
            <el-input-number 
              v-model="inputActualBalance" 
              :controls="false" 
              :min="0"
              placeholder="輸入實際餘額" 
              class="balance-input"
            />
            <el-button type="primary" :loading="savingBalance" @click="saveActualBalance">
              儲存基準
            </el-button>
          </div>
        </div>
        <div v-if="actualBalance !== null" class="current-balance-hint">
          目前系統記錄的 {{ selectedMonth }} 真實結餘為：<strong>HK$ {{ actualBalance.toLocaleString() }}</strong>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { TrendCharts, Bottom, Wallet, Umbrella } from '@element-plus/icons-vue'

const loading = ref(false)
const savingBalance = ref(false)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

// 數據狀態
const totalIncome = ref(0)
const processedExpense = ref(0)
const pendingExpense = ref(0)
const processedInsurance = ref(0)
const pendingInsurance = ref(0)

// 對帳狀態
const actualBalance = ref(null)
const inputActualBalance = ref(undefined)

// 計算實際總支出 (已處理 + 已轉)
const totalProcessed = computed(() => processedExpense.value + processedInsurance.value)

const fetchData = async () => {
  if (!selectedMonth.value) return
  loading.value = true

  try {
    const familyId = '00000000-0000-0000-0000-000000000001'

    const [incRes, expRes, insPayRes, polRes, balRes] = await Promise.all([
      supabase.from('incomes').select('amount').eq('year_month', selectedMonth.value),
      supabase.from('expenses').select('amount, status').eq('year_month', selectedMonth.value),
      supabase.from('insurance_payments').select('policy_id, status').eq('year_month', selectedMonth.value),
      supabase.from('insurance_policies').select('id, monthly_average'),
      supabase.from('monthly_balances').select('actual_balance').eq('year_month', selectedMonth.value).maybeSingle()
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error
    if (insPayRes.error) throw insPayRes.error
    if (polRes.error) throw polRes.error

    // 1. 計算收入
    totalIncome.value = (incRes.data || []).reduce((sum, item) => sum + Number(item.amount), 0)

    // 2. 計算普通支出
    processedExpense.value = 0
    pendingExpense.value = 0
    if (expRes.data) {
      expRes.data.forEach(item => {
        const amount = Number(item.amount)
        if (item.status === '已處理') {
          processedExpense.value += amount
        } else {
          pendingExpense.value += amount
        }
      })
    }

    // 3. 計算保險支出
    const policyMap = {}
    if (polRes.data) {
      polRes.data.forEach(p => { policyMap[p.id] = Number(p.monthly_average) })
    }

    processedInsurance.value = 0
    pendingInsurance.value = 0
    if (insPayRes.data) {
      insPayRes.data.forEach(item => {
        const amount = policyMap[item.policy_id] || 0
        if (item.status === '已轉') {
          processedInsurance.value += amount
        } else {
          pendingInsurance.value += amount
        }
      })
    }

    // 4. 銀行對帳資料
    if (balRes.data) {
      actualBalance.value = Number(balRes.data.actual_balance)
      inputActualBalance.value = actualBalance.value
    } else {
      actualBalance.value = null
      inputActualBalance.value = undefined
    }

  } catch (error) {
    console.error(error)
    ElMessage.error('載入月度總覽失敗')
  } finally {
    loading.value = false
  }
}

const saveActualBalance = async () => {
  if (inputActualBalance.value === undefined || inputActualBalance.value === null) {
    return ElMessage.warning('請輸入金額')
  }
  
  savingBalance.value = true
  const familyId = '00000000-0000-0000-0000-000000000001'

  try {
    const { error } = await supabase.from('monthly_balances').upsert({
      family_id: familyId,
      year_month: selectedMonth.value,
      actual_balance: inputActualBalance.value
    }, { onConflict: 'family_id, year_month' })

    if (error) throw error
    
    actualBalance.value = inputActualBalance.value
    ElMessage.success(`✅ ${selectedMonth.value} 的銀行結餘已更新`)
  } catch (err) {
    ElMessage.error('儲存失敗：' + err.message)
  } finally {
    savingBalance.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.cashflow-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
.header-left h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }
.month-picker { width: 140px; }

/* 網格佈局 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
@media (min-width: 768px) { .dashboard-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }

/* 統計卡片 */
.stat-card { 
  border-radius: 20px; 
  border: none; 
  background: #ffffff; 
  height: 100%;
  box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  padding: 24px;
  height: 100%;
}
.stat-icon { 
  width: 48px; height: 48px; 
  border-radius: 14px; 
  display: flex; justify-content: center; align-items: center; 
  font-size: 24px; margin-right: 16px; 
  flex-shrink: 0; 
}

/* 各卡片專屬樣式 */
.income-card .stat-icon { background: #ecfdf5; color: #10b981; }
.expense-card .stat-icon { background: #fef2f2; color: #ef4444; }
.insurance-card .stat-icon { background: #fffbeb; color: #f59e0b; }
.total-card .stat-icon { background: #EEF2FF; color: #6366F1; }

.stat-info { display: flex; flex-direction: column; width: 100%; }
.stat-label { font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500; }
.stat-value { font-size: 24px; font-weight: 700; font-family: monospace; line-height: 1.2; margin-bottom: 8px; }
.stat-sub { font-size: 13px; color: #94a3b8; margin-top: auto; }

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.text-primary { color: #6366F1; }
.text-muted { color: #94a3b8; }

/* 🆕 對帳區塊樣式 */
.reconcile-card { border-radius: 20px; border: none; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }
.reconcile-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
.reconcile-info h3 { margin: 0 0 6px 0; color: #1e293b; font-size: 18px; font-weight: 700; }
.reconcile-info p { margin: 0; color: #64748b; font-size: 14px; }
.reconcile-input { display: flex; align-items: center; gap: 12px; }
.balance-input { width: 180px; }
.balance-input :deep(.el-input__wrapper) { border-radius: 10px; box-shadow: 0 0 0 1px #E2E8F0 inset; }
.current-balance-hint { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0; font-size: 14px; color: #64748b; }
.current-balance-hint strong { color: #6366F1; font-family: monospace; font-size: 16px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-left { width: 100%; justify-content: space-between; }
  .stat-value { font-size: 22px; }
  .reconcile-content { flex-direction: column; align-items: flex-start; }
  .reconcile-input { width: 100%; }
  .balance-input { flex: 1; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/CashflowView.vue
V: 1793977000
W: ai-wa-fs-002
═══ -->