<template>
  <div class="annual-container">
    <div class="page-header">
      <div class="header-left">
        <h2>年度報表</h2>
        <el-date-picker 
          v-model="selectedYear" 
          type="year" 
          placeholder="選擇年份" 
          value-format="YYYY" 
          @change="fetchData" 
          class="year-picker"
        />
      </div>
      <div class="header-actions">
        <el-radio-group v-model="viewMode" class="view-toggle" @change="fetchData">
          <el-radio-button label="year">全年</el-radio-button>
          <el-radio-button label="month">單月</el-radio-button>
        </el-radio-group>
        <el-select v-if="viewMode === 'month'" v-model="selectedMonth" class="month-picker" @change="fetchData">
          <el-option v-for="m in 12" :key="m" :label="`${m} 月`" :value="String(m).padStart(2, '0')" />
        </el-select>
        <el-button type="success" plain icon="Download" @click="exportExcel" :loading="exporting" :disabled="monthlyData.length === 0">
          匯出明細
        </el-button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <el-row :gutter="20" class="mb-24" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ viewTitle }}總收入</div>
          <div class="stat-value text-green">HK$ {{ totalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ viewTitle }}總支出</div>
          <div class="stat-value text-red">HK$ {{ totalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ viewTitle }}保險支出</div>
          <div class="stat-value text-orange">HK$ {{ totalInsurance.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ viewTitle }}淨結餘</div>
          <div class="stat-value" :class="netBalance >= 0 ? 'text-green' : 'text-red'">
            {{ netBalance >= 0 ? '+' : '' }} HK$ {{ netBalance.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度/單月明細表格 -->
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
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const currentYear = new Date().getFullYear().toString()
const selectedYear = ref(currentYear)
const viewMode = ref('year') // 'year' | 'month'
const selectedMonth = ref(String(new Date().getMonth() + 1).padStart(2, '0')) // 01~12

const loading = ref(false)
const exporting = ref(false)

const monthlyData = ref([])
const rawIncomes = ref([])
const rawExpenses = ref([])
const rawInsurancePayments = ref([])
const policies = ref([])

const viewTitle = computed(() => {
  return viewMode.value === 'year' ? `年度` : `${parseInt(selectedMonth.value)} 月`
})

// 統計加總
const totalIncome = computed(() => monthlyData.value.reduce((sum, item) => sum + item.income, 0))
const totalExpense = computed(() => monthlyData.value.reduce((sum, item) => sum + item.expense, 0))
const totalInsurance = computed(() => monthlyData.value.reduce((sum, item) => sum + item.insurance, 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value - totalInsurance.value)

const fetchData = async () => {
  loading.value = true
  
  try {
    // 構建查詢前綴
    const prefix = viewMode.value === 'year' 
      ? `${selectedYear.value}-%` 
      : `${selectedYear.value}-${selectedMonth.value}%`

    // 平行抓取：收入、支出(已處理)、保險(已轉)、保單主檔
    const [incRes, expRes, insRes, polRes] = await Promise.all([
      supabase.from('incomes').select('*').like('year_month', prefix),
      supabase.from('expenses').select('*').like('year_month', prefix).eq('status', '已處理'),
      supabase.from('insurance_payments').select('*').like('year_month', prefix).eq('status', '已轉'),
      supabase.from('insurance_policies').select('*')
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error
    if (insRes.error) throw insRes.error

    rawIncomes.value = incRes.data || []
    rawExpenses.value = expRes.data || []
    rawInsurancePayments.value = insRes.data || []
    policies.value = polRes.data || []

    const policyMap = {}
    policies.value.forEach(p => { policyMap[p.id] = Number(p.monthly_average) })

    // 初始化資料結構
    let tempData = []
    if (viewMode.value === 'year') {
      tempData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, income: 0, expense: 0, insurance: 0, balance: 0
      }))
    } else {
      const m = parseInt(selectedMonth.value)
      tempData = [{ month: m, income: 0, expense: 0, insurance: 0, balance: 0 }]
    }

    // 填入資料
    const getMonthIndex = (ym) => {
      const m = parseInt(ym.split('-')[1])
      return viewMode.value === 'year' ? m - 1 : 0
    }

    rawIncomes.value.forEach(item => {
      const idx = getMonthIndex(item.year_month)
      if (tempData[idx]) tempData[idx].income += Number(item.amount)
    })

    rawExpenses.value.forEach(item => {
      const idx = getMonthIndex(item.year_month)
      if (tempData[idx]) tempData[idx].expense += Number(item.amount)
    })

    rawInsurancePayments.value.forEach(item => {
      const idx = getMonthIndex(item.year_month)
      const amount = policyMap[item.policy_id] || 0
      if (tempData[idx]) tempData[idx].insurance += amount
    })

    // 計算結餘
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

// 表格底部加總列
const getSummaries = (param) => {
  const { columns } = param
  const sums = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = viewTitle.value + '總計'
      return
    }
    if (column.property === 'income') sums[index] = `HK$ ${totalIncome.value.toLocaleString()}`
    else if (column.property === 'expense') sums[index] = `HK$ ${totalExpense.value.toLocaleString()}`
    else if (column.property === 'insurance') sums[index] = `HK$ ${totalInsurance.value.toLocaleString()}`
    else if (column.property === 'balance') sums[index] = `HK$ ${netBalance.value.toLocaleString()}`
    else sums[index] = ''
  })
  return sums
}

// 匯出 Excel
const exportExcel = async () => {
  if (monthlyData.value.length === 0) return ElMessage.warning('無資料可匯出')
  exporting.value = true

  try {
    // 1. 整理匯出明細
    const policyMap = {}
    policies.value.forEach(p => { policyMap[p.id] = p })

    const allItems = []

    // 收集收入
    rawIncomes.value.forEach(i => {
      allItems.push({
        year_month: i.year_month,
        type: '收入',
        payer: i.member_name || '未指定',
        name: i.name,
        category: '收入',
        amount: Number(i.amount),
        status: '已入帳'
      })
    })

    // 收集支出
    rawExpenses.value.forEach(e => {
      allItems.push({
        year_month: e.year_month,
        type: '支出',
        payer: e.payer_name || '未指定',
        name: e.name,
        category: e.category_name || '未分類',
        amount: Number(e.amount),
        status: e.status
      })
    })

    // 收集保險
    rawInsurancePayments.value.forEach(ip => {
      const p = policyMap[ip.policy_id]
      if (p) {
        allItems.push({
          year_month: ip.year_month,
          type: '保險',
          payer: p.holder_name || '家庭共用', // 🆕 改為讀取持有人
          name: `保險供款：${p.name}`,
          category: '保險',
          amount: Number(p.monthly_average),
          status: '已轉'
        })
      }
    })

    // 2. 建立 Excel 工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('收支明細')

    worksheet.columns = [
      { header: '月份', key: 'year_month', width: 12 },
      { header: '類型', key: 'type', width: 10 },
      { header: '對象', key: 'payer', width: 15 },
      { header: '項目名稱', key: 'name', width: 30 },
      { header: '類別', key: 'category', width: 15 },
      { header: '金額', key: 'amount', width: 15, style: { numFmt: '#,##0.00' } },
      { header: '狀態', key: 'status', width: 12 }
    ]

    // 表頭樣式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    // 3. 按對象分組並寫入
    const grouped = {}
    allItems.forEach(item => {
      if (!grouped[item.payer]) grouped[item.payer] = []
      grouped[item.payer].push(item)
    })

    let currentRow = 2
    let grandTotal = 0

    // 遍歷每個對象
    for (const [payer, items] of Object.entries(grouped)) {
      let subtotal = 0

      items.forEach(item => {
        const row = worksheet.addRow(item)
        row.getCell('amount').alignment = { horizontal: 'right' }
        subtotal += item.amount
        currentRow++
      })

      grandTotal += subtotal

      // 寫入小計
      const subtotalRow = worksheet.addRow({
        year_month: '',
        type: '',
        payer: '',
        name: `${payer} 小計`,
        category: '',
        amount: subtotal,
        status: ''
      })
      
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`)
      subtotalRow.getCell(4).alignment = { horizontal: 'right' }
      subtotalRow.getCell(6).alignment = { horizontal: 'right' }
      subtotalRow.font = { bold: true }
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
      
      currentRow++
    }

    // 4. 寫入總計
    const totalRow = worksheet.addRow({
      year_month: '',
      type: '',
      payer: '',
      name: `${viewTitle.value}總計`,
      category: '',
      amount: grandTotal,
      status: ''
    })
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`)
    totalRow.getCell(4).alignment = { horizontal: 'right' }
    totalRow.getCell(6).alignment = { horizontal: 'right' }
    totalRow.font = { bold: true, color: { argb: 'FF6366F1' } }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }

    // 設置全局邊框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        }
      })
    })

    // 5. 導出檔案
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `收支明細_${viewTitle.value}.xlsx`)

    ElMessage.success('✅ 報表匯出成功')
  } catch (err) {
    console.error(err)
    ElMessage.error('匯出失敗：' + err.message)
  } finally {
    exporting.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.annual-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-left h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }
.year-picker { width: 120px; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.month-picker { width: 100px; }

.mb-24 { margin-bottom: 24px; }
.stat-card { border-radius: 20px; background: #ffffff; border: none; }
.stat-label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
.stat-value { font-size: 22px; font-weight: bold; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.font-bold { font-weight: 700; }

.table-card { border-radius: 20px; border: none; overflow: hidden; }
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
:deep(.el-table__footer-wrapper tbody td) {
  font-weight: bold;
  background-color: #F8FAFC;
  color: #1e293b;
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
  .stat-value { font-size: 18px; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/AnnualReportView.vue
V: 1793972300
W: ai-wa-fs-002
═══ -->