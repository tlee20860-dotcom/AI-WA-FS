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
          <el-table-column prop="balance" label="當月淨收支" align="right">
            <template #default="scope">
              <span :class="scope.row.balance >= 0 ? 'text-green' : 'text-red'" class="font-bold">
                {{ scope.row.balance >= 0 ? '+' : '' }} HK$ {{ scope.row.balance.toLocaleString() }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="actualBalance" label="實際銀行結餘" align="right">
            <template #default="scope">
              <span v-if="scope.row.actualBalance !== null" class="font-bold font-monospace">
                HK$ {{ scope.row.actualBalance.toLocaleString() }}
              </span>
              <span v-else class="text-muted">-</span>
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
const selectedMonth = ref(String(new Date().getMonth() + 1).padStart(2, '0'))

const loading = ref(false)
const exporting = ref(false)

const monthlyData = ref([])
const rawIncomes = ref([])
const rawExpenses = ref([])
const rawInsurancePayments = ref([])
const rawBalances = ref([])
const policies = ref([])

// 動態標題：顯示年份或年月
const viewTitle = computed(() => {
  return viewMode.value === 'year' 
    ? `${selectedYear.value} 年` 
    : `${selectedYear.value} 年 ${parseInt(selectedMonth.value)} 月`
})

// 保留這些變數是為了下方表格的「底部總計列」
const totalIncome = computed(() => monthlyData.value.reduce((sum, item) => sum + item.income, 0))
const totalExpense = computed(() => monthlyData.value.reduce((sum, item) => sum + item.expense, 0))
const totalInsurance = computed(() => monthlyData.value.reduce((sum, item) => sum + item.insurance, 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value - totalInsurance.value)

const fetchData = async () => {
  loading.value = true
  
  try {
    const prefix = viewMode.value === 'year' 
      ? `${selectedYear.value}-%` 
      : `${selectedYear.value}-${selectedMonth.value}%`

    const [incRes, expRes, insRes, polRes, balRes] = await Promise.all([
      supabase.from('incomes').select('*').like('year_month', prefix),
      supabase.from('expenses').select('*').like('year_month', prefix).eq('status', '已處理'),
      supabase.from('insurance_payments').select('*').like('year_month', prefix).eq('status', '已轉'),
      supabase.from('insurance_policies').select('*'),
      supabase.from('monthly_balances').select('*').like('year_month', prefix)
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error
    if (insRes.error) throw insRes.error

    rawIncomes.value = incRes.data || []
    rawExpenses.value = expRes.data || []
    rawInsurancePayments.value = insRes.data || []
    policies.value = polRes.data || []
    rawBalances.value = balRes.data || []

    const policyMap = {}
    policies.value.forEach(p => { policyMap[p.id] = Number(p.monthly_average) })

    let tempData = []
    if (viewMode.value === 'year') {
      tempData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, income: 0, expense: 0, insurance: 0, balance: 0, actualBalance: null
      }))
    } else {
      const m = parseInt(selectedMonth.value)
      tempData = [{ month: m, income: 0, expense: 0, insurance: 0, balance: 0, actualBalance: null }]
    }

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

    rawBalances.value.forEach(item => {
      const idx = getMonthIndex(item.year_month)
      if (tempData[idx]) tempData[idx].actualBalance = Number(item.actual_balance)
    })

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

// 重寫 Excel 匯出：13 個分頁，且拆分收入/支出小計
const exportExcel = async () => {
  if (monthlyData.value.length === 0) return ElMessage.warning('無資料可匯出')
  exporting.value = true

  try {
    const workbook = new ExcelJS.Workbook()
    const policyMap = {}
    policies.value.forEach(p => { policyMap[p.id] = p })

    // 收集所有明細資料，並補齊標準欄位
    const allItems = []

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

    rawInsurancePayments.value.forEach(ip => {
      const p = policyMap[ip.policy_id]
      if (p) {
        allItems.push({
          year_month: ip.year_month,
          type: '保險',
          payer: p.holder_name || '家庭共用',
          name: `保險供款：${p.name}`,
          category: '保險',
          amount: Number(p.monthly_average),
          status: '已轉'
        })
      }
    })

    // 輔助函式：生成單一工作表
    const buildWorksheet = (ws, items, title) => {
      ws.columns = [
        { header: '月份', key: 'year_month', width: 12 },
        { header: '類型', key: 'type', width: 10 },
        { header: '對象', key: 'payer', width: 15 },
        { header: '項目名稱', key: 'name', width: 30 },
        { header: '類別', key: 'category', width: 15 },
        { header: '金額', key: 'amount', width: 15, style: { numFmt: '#,##0.00' } },
        { header: '狀態', key: 'status', width: 12 }
      ]

      const headerRow = ws.getRow(1)
      headerRow.font = { bold: true }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

      if (items.length === 0) {
        ws.addRow({ year_month: '本月無收支紀錄', type: '', payer: '', name: '', category: '', amount: '', status: '' })
        ws.mergeCells('A2:G2')
        ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getCell('A2').font = { color: { argb: 'FF999999' }, italic: true }
        return
      }

      const grouped = {}
      items.forEach(item => {
        if (!grouped[item.payer]) grouped[item.payer] = []
        grouped[item.payer].push(item)
      })

      let currentRow = 2
      let grandIncome = 0
      let grandExpense = 0

      for (const [payer, groupItems] of Object.entries(grouped)) {
        let subtotalIncome = 0
        let subtotalExpense = 0

        groupItems.forEach(item => {
          const row = ws.addRow(item)
          row.getCell('amount').alignment = { horizontal: 'right' }
          
          if (item.type === '收入') {
            subtotalIncome += item.amount
          } else {
            subtotalExpense += item.amount
          }
          currentRow++
        })

        grandIncome += subtotalIncome
        grandExpense += subtotalExpense

        // 🆕 寫入「收入小計」
        if (subtotalIncome > 0) {
          const incSubtotalRow = ws.addRow({
            year_month: '', type: '', payer: '', name: `${payer} 收入小計`, category: '', amount: subtotalIncome, status: ''
          })
          ws.mergeCells(`A${currentRow}:D${currentRow}`)
          incSubtotalRow.getCell(4).alignment = { horizontal: 'right' }
          incSubtotalRow.getCell(6).alignment = { horizontal: 'right' }
          incSubtotalRow.font = { bold: true, color: { argb: 'FF10B981' } } // 綠色
          incSubtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }
          currentRow++
        }

        // 🆕 寫入「支出小計」
        if (subtotalExpense > 0) {
          const expSubtotalRow = ws.addRow({
            year_month: '', type: '', payer: '', name: `${payer} 支出小計`, category: '', amount: subtotalExpense, status: ''
          })
          ws.mergeCells(`A${currentRow}:D${currentRow}`)
          expSubtotalRow.getCell(4).alignment = { horizontal: 'right' }
          expSubtotalRow.getCell(6).alignment = { horizontal: 'right' }
          expSubtotalRow.font = { bold: true, color: { argb: 'FFEF4444' } } // 紅色
          expSubtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
          currentRow++
        }
      }

      // 🆕 寫入全局總計
      const totalIncomeRow = ws.addRow({
        year_month: '', type: '', payer: '', name: `${title}總收入`, category: '', amount: grandIncome, status: ''
      })
      ws.mergeCells(`A${currentRow}:D${currentRow}`)
      totalIncomeRow.getCell(4).alignment = { horizontal: 'right' }
      totalIncomeRow.getCell(6).alignment = { horizontal: 'right' }
      totalIncomeRow.font = { bold: true, color: { argb: 'FF10B981' } }
      totalIncomeRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
      currentRow++

      const totalExpenseRow = ws.addRow({
        year_month: '', type: '', payer: '', name: `${title}總支出`, category: '', amount: grandExpense, status: ''
      })
      ws.mergeCells(`A${currentRow}:D${currentRow}`)
      totalExpenseRow.getCell(4).alignment = { horizontal: 'right' }
      totalExpenseRow.getCell(6).alignment = { horizontal: 'right' }
      totalExpenseRow.font = { bold: true, color: { argb: 'FFEF4444' } }
      totalExpenseRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      currentRow++

      const netRow = ws.addRow({
        year_month: '', type: '', payer: '', name: `${title}淨收支`, category: '', amount: grandIncome - grandExpense, status: ''
      })
      ws.mergeCells(`A${currentRow}:D${currentRow}`)
      netRow.getCell(4).alignment = { horizontal: 'right' }
      netRow.getCell(6).alignment = { horizontal: 'right' }
      netRow.font = { bold: true, color: { argb: 'FF6366F1' } }
      netRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }

      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
        })
      })
    }

    // 1. 生成「整年」分頁
    const wsYear = workbook.addWorksheet('整年')
    buildWorksheet(wsYear, allItems, '整年')

    // 2. 生成「1月」到「12月」分頁
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0')
      const targetYM = `${selectedYear.value}-${monthStr}`
      const monthItems = allItems.filter(item => item.year_month === targetYM)
      
      const wsMonth = workbook.addWorksheet(`${m}月`)
      buildWorksheet(wsMonth, monthItems, `${m}月`)
    }

    // 導出檔案
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `收支明細_${selectedYear.value}.xlsx`)

    ElMessage.success('✅ 報表匯出成功（包含整年與 12 個月分頁）')
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

.table-card { border-radius: 20px; border: none; overflow: hidden; }
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
:deep(.el-table__footer-wrapper tbody td) {
  font-weight: bold;
  background-color: #F8FAFC;
  color: #1e293b;
}

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-orange { color: #f59e0b; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }
.font-monospace { font-family: monospace; font-size: 14px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/AnnualReportView.vue
V: 1794006000
W: ai-wa-fs-002
═══ -->