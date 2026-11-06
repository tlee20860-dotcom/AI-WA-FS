<template>
  <div class="settlement-container">
    <div class="page-header">
      <div class="header-left">
        <h2>每月待轉帳表</h2>
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

    <el-empty v-else-if="groupedExpenses.length === 0" description="本月沒有待轉帳的項目，太棒了！" />

    <div v-else class="settlement-grid">
      <!-- 按對象分組顯示 -->
      <el-card v-for="group in groupedExpenses" :key="group.payer" class="payer-card" shadow="hover">
        <div class="payer-header">
          <div class="payer-info">
            <h3>{{ group.payer }}</h3>
            <span class="item-count">{{ group.items.length }} 筆待處理</span>
          </div>
          <div class="total-amount">
            <span>待轉總額</span>
            <strong class="text-red">HK$ {{ group.total.toLocaleString() }}</strong>
          </div>
        </div>

        <div class="item-list">
          <div class="item-row" v-for="item in group.items" :key="item.id">
            <div class="item-name">
              <span>{{ item.name }}</span>
              <el-tag size="small" type="info">{{ item.category_name || '未分類' }}</el-tag>
            </div>
            <div class="item-amount">HK$ {{ item.amount.toLocaleString() }}</div>
          </div>
        </div>

        <div class="payer-footer">
          <el-button type="success" plain style="width: 100%;" @click="markAllAsPaid(group)">
            ✅ 標記 {{ group.payer }} 全部已轉
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const d = new Date()
const selectedMonth = ref(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
const expenses = ref([])
const loading = ref(false)

// 🆕 將未處理的支出按對象分組
const groupedExpenses = computed(() => {
  const pending = expenses.value.filter(e => e.status !== '已處理')
  
  const groups = {}
  pending.forEach(item => {
    const payer = item.payer_name || '未指定對象'
    if (!groups[payer]) {
      groups[payer] = { payer, total: 0, items: [] }
    }
    groups[payer].items.push(item)
    groups[payer].total += Number(item.amount)
  })

  return Object.values(groups).sort((a, b) => b.total - a.total)
})

const fetchData = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('year_month', selectedMonth.value)
    .neq('status', '已處理') // 只抓取未處理的
    .order('created_at', { ascending: false })

  if (error) ElMessage.error('載入待轉帳資料失敗')
  else expenses.value = data || []
  
  loading.value = false
}

// 🆕 一鍵標記某人的所有項目為已轉
const markAllAsPaid = async (group) => {
  try {
    const ids = group.items.map(i => i.id)
    
    const { error } = await supabase
      .from('expenses')
      .update({ status: '已處理' })
      .in('id', ids)

    if (error) throw error
    ElMessage.success(`✅ 已將 ${group.payer} 的 ${ids.length} 筆項目標記為已轉`)
    fetchData()
  } catch (err) {
    ElMessage.error('更新失敗：' + err.message)
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.settlement-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-left h2 { margin: 0; color: #1e293b; }
.month-picker { width: 140px; }

.settlement-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.payer-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }

.payer-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 12px; }
.payer-info h3 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; }
.item-count { font-size: 13px; color: #64748b; }
.total-amount { text-align: right; }
.total-amount span { display: block; font-size: 12px; color: #64748b; margin-bottom: 2px; }
.total-amount strong { font-size: 20px; }
.text-red { color: #ef4444; }

.item-list { max-height: 250px; overflow-y: auto; margin-bottom: 15px; }
.item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
.item-row:last-child { border-bottom: none; }
.item-name { display: flex; align-items: center; gap: 8px; color: #334155; }
.item-amount { font-weight: 600; color: #475569; font-family: monospace; }

.payer-footer { border-top: 1px dashed #e2e8f0; padding-top: 15px; }

@media (max-width: 768px) {
  .settlement-grid { grid-template-columns: 1fr; }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettlementView.vue
V: 1793810600
W: ai-wa-fs-001
═══ -->