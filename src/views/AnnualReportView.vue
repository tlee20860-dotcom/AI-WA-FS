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
      </div>
    </div>

    <!-- 年度總計卡片 -->
    <el-row :gutter="10" class="mb-20" v-loading="loading">
      <el-col :xs="12" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">年度總收入</div>
          <div class="stat-value text-green">HK$ {{ yearTotalIncome.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">年度總支出</div>
          <div class="stat-value text-red">HK$ {{ yearTotalExpense.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
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
        <el-table :data="monthlyData" style="width: 100%; min-width: 500px;" stripe>
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
          <el-table-column prop="expense" label="總支出" align="right">
            <template #default="scope">
              <span class="text-red">HK$ {{ scope.row.expense.toLocaleString() }}</span>
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

// 取得當前年份
const currentYear = new Date().getFullYear().toString()
const selectedYear = ref(currentYear)
const loading = ref(false)

// 儲存12個月的資料
const monthlyData = ref([])

// 年度總計 (透過 computed 從 monthlyData 加總)
const yearTotalIncome = computed(() => monthlyData.value.reduce((sum, item) => sum + item.income, 0))
const yearTotalExpense = computed(() => monthlyData.value.reduce((sum, item) => sum + item.expense, 0))
const yearNetBalance = computed(() => yearTotalIncome.value - yearTotalExpense.value)

const fetchData = async () => {
  loading.value = true
  
  try {
    // 平行抓取該年份所有的收入與支出
    const [incRes, expRes] = await Promise.all([
      supabase.from('incomes').select('year_month, amount').like('year_month', `${selectedYear.value}-%`),
      supabase.from('expenses').select('year_month, amount').like('year_month', `${selectedYear.value}-%`)
    ])

    if (incRes.error) throw incRes.error
    if (expRes.error) throw expRes.error

    // 初始化 1~12 月的空資料
    const tempData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      balance: 0
    }))

    // 填入收入資料
    if (incRes.data) {
      incRes.data.forEach(item => {
        const m = parseInt(item.year_month.split('-')[1]) - 1
        if (tempData[m]) tempData[m].income += Number(item.amount)
      })
    }

    // 填入支出資料
    if (expRes.data) {
      expRes.data.forEach(item => {
        const m = parseInt(item.year_month.split('-')[1]) - 1
        if (tempData[m]) tempData[m].expense += Number(item.amount)
      })
    }

    // 計算每月結餘
    tempData.forEach(item => {
      item.balance = item.income - item.expense
    })

    monthlyData.value = tempData

  } catch (error) {
    ElMessage.error('載入報表失敗：' + error.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.annual-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.page-header h2 { margin: 0; color: #1e293b; }
.year-picker { width: 120px; }

.mb-20 { margin-bottom: 20px; }
.stat-card { border-radius: 8px; background: #f8fafc; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 5px; }
.stat-value { font-size: 20px; font-weight: bold; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.font-bold { font-weight: 600; }

.table-card { border-radius: 8px; border: none; overflow: hidden; }
.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* 手機端優化 */
@media (max-width: 768px) {
  .stat-value { font-size: 18px; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/AnnualReportView.vue
V: 1793808400
W: ai-wa-fs-001
═══ -->