<template>
  <div class="annual-container">
    <div class="page-header">
      <h2>年度報表</h2>
      <div class="header-actions">
        <el-date-picker 
          v-model="selectedYear" 
          type="year" 
          placeholder="選擇年份" 
          value-format="YYYY" 
          @change="fetchData" 
          class="year-picker"
        />
        <el-button type="success" plain icon="Download" @click="exportCSV" :disabled="monthlyData.length === 0">
          匯出 CSV
        </el-button>
      </div>
    </div>

    <!-- 年度總計卡片 -->
    <el-row :gutter="10" class="mb-20" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">年度總收入</div>
          <div class="stat-value text-green">HK$ {{ yearTotalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">年度總支出</div>
          <div class="stat-value text-red">HK$ {{ yearTotalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">保險總支出</div>
          <div class="stat-value text-orange">HK$ {{ yearTotalInsurance.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">年度淨結餘</div>
          <div class="stat-value" :class="yearNetBalance >= 0 ? 'text-green' : 'text-red'">
            {{ yearNetBalance >= 0 ? '+' : '' }} HK$ {{ yearNetBalance.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度明細表格 -->
    <el-card shadow="never" class="table-card" v-loading="loading">
      <div class="table-wrapper">
        <el-table :data="monthlyData" style="width: 100%; min-width: 600px;" stripe show-summary :summary-method="getSummaries">
          <el-table-column prop="month" label="月份" width="100">
            <template #default="scope">
              <strong>{{ scope.row.month }} 月</strong>
            </template>
          </el-table-column>
          <el-table-column prop="income" label="總收入" align="right">
            <template #default="scope">
              <span class="text-green">HK$ {{ scope.row.income.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="expense" label="一般支出" align="right">
            <template #default="scope">
              <span class="text-red">HK$ {{ scope.row.expense.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="insurance" label="保險供款" align="right">
            <template #default="scope">
              <span class="text-orange">HK$ {{ scope.row.insurance.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="balance" label="當月結餘" align="right">
            <template #default="scope">
              <span :class="scope.row.balance >= 0 ? 'text-green' : 'text-red'" class="font-bold">
                {{ scope.row.balance >= 0 ? '+' : '' }} HK$ {{ scope.row.balance.toLocaleString() }}
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
import { Download } from '@element-plus/icons-vue'

// 取得當前年份
const currentYear = new Date().getFullYear().toString()
const selectedYear = ref(currentYear)
const loading = ref(false)

// 儲存12個月的資料
const monthlyData = ref([])

// 年度總計
const yearTotalIncome = computed(() => monthlyData.value.reduce((sum, item) => sum + item.income, 0))
const yearTotalExpense = computed(() => monthlyData.value.reduce((sum, item) => sum + item.expense, 0))
const yearTotalInsurance = computed(() => monthlyData.value.reduce((sum, item) => sum + item.insurance, 0))
const yearNetBalance = computed(() => yearTotalIncome.value - yearTotalExpense.value - yearTotalInsurance.value)

const fetchData = async () => {
  loading.value = true
  
  try {
    // 平行抓取該年份所有的收入、支出與保險轉帳紀錄
    const [incRes, expRes, insRes] = await Promise.all([
      supabase.from('incomes').select('year_month, amount').like('year_month', `${selectedYear.value}-%`),
      supabase.from('expenses').select('year_month, amount').like('year_month', `${selectedYear.value}-%`),
      supabase.from('insurance_payments')
        .select('year_month, policy_id, status')
        .like('year_month', `${selectedYear.value}-%`)
        .eq('status', '已轉')
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error
    if (insRes.error) throw insRes.error

    // 抓取保單月均金額，用來計算保險支出
    const polRes = await supabase.from('insurance_policies').select('id, monthly_average')
    const policyMap = {}
    if (polRes.data) {
      polRes.data.forEach(p => { policyMap[p.id] = Number(p.monthly_average) })
    }

    // 初始化 1~12 月的空資料
    const tempData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      insurance: 0,
      balance: 0
    }))

    // 填入收入
    if (incRes.data) {
      incRes.data.forEach(item => {
        const m = parseInt(item.year_month.split('-')[1]) - 1
        if (tempData[m]) tempData[m].income += Number(item.amount)
      })
    }

    // 填入一般支出
    if (expRes.data) {
      expRes.data.forEach(item => {
        const m = parseInt(item.year_month.split('-')[1]) - 1
        if (tempData[m]) tempData[m].expense += Number(item.amount)
      })
    }

    // 填入保險支出
    if (insRes.data) {
      insRes.data.forEach(item => {
        const m = parseInt(item.year_month.split('-')[1]) - 1
        const amount = policyMap[item.policy_id] || 0
        if (tempData[m]) tempData[m].insurance += amount
      })
    }

    // 計算每月結餘 (總收入 - 一般支出 - 保險支出)
    tempData.forEach(item => {
      item.balance = item.income - item.expense - item.insurance
    })

    monthlyData.value = tempData

  } catch (error) {
    ElMessage.error('載入報表失敗：' + error.message)
  } finally {
    loading.value = false
  }
}

// 🆕 表格底部加總列
const getSummaries = (param) => {
  const { columns } = param
  const sums = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '年度總計'
      return
    }
    if (column.property === 'income') {
      sums[index] = `HK$ ${yearTotalIncome.value.toLocaleString()}`
    } else if (column.property === 'expense') {
      sums[index] = `HK$ ${yearTotalExpense.value.toLocaleString()}`
    } else if (column.property === 'insurance') {
      sums[index] = `HK$ ${yearTotalInsurance.value.toLocaleString()}`
    } else if (column.property === 'balance') {
      sums[index] = `HK$ ${yearNetBalance.value.toLocaleString()}`
    } else {
      sums[index] = ''
    }
  })
  return sums
}

// 🆕 匯出 CSV
const exportCSV = () => {
  if (monthlyData.value.length === 0) return

  const headers = ['月份', '總收入(HKD)', '一般支出(HKD)', '保險供款(HKD)', '當月結餘(HKD)']
  const rows = monthlyData.value.map(d => [
    `${d.month}月`,
    d.income,
    d.expense,
    d.insurance,
    d.balance
  ])

  // 加上總計列
  rows.push([
    '年度總計',
    yearTotalIncome.value,
    yearTotalExpense.value,
    yearTotalInsurance.value,
    yearNetBalance.value
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.join(','))
  ].join('\n')

  // 加上 BOM 讓 Excel 正確顯示中文
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `年度報表_${selectedYear.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('✅ CSV 已下載')
}

onMounted(() => fetchData())
</script>

<style scoped>
.annual-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.page-header h2 { margin: 0; color: #1e293b; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.year-picker { width: 120px; }

.mb-20 { margin-bottom: 20px; }
.stat-card { border-radius: 8px; background: #f8fafc; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 5px; }
.stat-value { font-size: 18px; font-weight: bold; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.font-bold { font-weight: 600; }

.table-card { border-radius: 8px; border: none; overflow: hidden; }
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
:deep(.el-table__footer-wrapper tbody td) {
  font-weight: bold;
  background-color: #f8fafc;
  color: #1e293b;
}

@media (max-width: 768px) {
  .stat-value { font-size: 16px; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/AnnualReportView.vue
V: 1793810500
W: ai-wa-fs-001
═══ -->