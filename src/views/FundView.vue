<template>
  <div class="fund-container">
    <div class="page-header">
      <h2>基金投資表</h2>
      <div class="header-actions">
        <el-button @click="openFundDialog()">+ 新增基金</el-button>
        <el-button type="primary" @click="openSnapshotDialog()">+ 輸入快照</el-button>
      </div>
    </div>

    <!-- 總計卡片 -->
    <el-row :gutter="10" class="mb-20">
      <el-col :xs="12" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">總投入成本</div>
          <div class="stat-value">HK$ {{ totalCost.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">當前總現值</div>
          <div class="stat-value text-blue">HK$ {{ totalValue.toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">總帳面盈虧</div>
          <div class="stat-value" :class="totalPnl >= 0 ? 'text-green' : 'text-red'">
            {{ totalPnl >= 0 ? '+' : '' }} HK$ {{ totalPnl.toLocaleString() }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 基金列表 -->
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>
    <el-empty v-else-if="funds.length === 0" description="尚無基金，請點擊右上角新增。" />

    <div v-else class="fund-grid">
      <el-card v-for="fund in funds" :key="fund.id" class="fund-card" shadow="hover">
        <div class="card-header">
          <h3>{{ fund.name }}</h3>
          <el-button type="danger" text size="small" @click="deleteFund(fund.id)">刪除</el-button>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <span class="label">投入成本</span>
            <span class="value">HK$ {{ fund.manual_cost.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">當前現值</span>
            <span class="value text-blue">HK$ {{ getLatestValue(fund).toLocaleString() }}</span>
          </div>
          
          <div class="pnl-box" :class="getPnl(fund) >= 0 ? 'pnl-positive' : 'pnl-negative'">
            <span>盈虧</span>
            <strong>{{ getPnl(fund) >= 0 ? '+' : '' }} HK$ {{ getPnl(fund).toLocaleString() }}</strong>
          </div>
          
          <div class="latest-info" v-if="getLatestSnapshot(fund)">
            最新快照：{{ getLatestSnapshot(fund).year_month }} 
            ({{ getLatestSnapshot(fund).units }} 單位 @ USD {{ getLatestSnapshot(fund).nav }})
          </div>
          <div class="latest-info" v-else>
            尚未輸入任何快照
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增基金彈窗 -->
    <el-dialog v-model="fundDialogVisible" title="新增基金" width="90%" max-width="400px">
      <el-form :model="fundForm" label-position="top">
        <el-form-item label="基金名稱" required>
          <el-input v-model="fundForm.name" placeholder="例如：駿利亨德森遠見基金" />
        </el-form-item>
        <el-form-item label="投入成本 (HKD)" required>
          <el-input-number v-model="fundForm.manual_cost" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitFund">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 輸入快照彈窗 -->
    <el-dialog v-model="snapshotDialogVisible" title="輸入基金快照" width="90%" max-width="450px">
      <el-form :model="snapshotForm" label-position="top">
        <el-form-item label="選擇基金" required>
          <el-select v-model="snapshotForm.fund_id" style="width: 100%">
            <el-option v-for="f in funds" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份" required>
          <el-date-picker v-model="snapshotForm.year_month" type="month" value-format="YYYY-MM" style="width: 100%" />
        </el-form-item>
        
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="單位數" required>
              <el-input-number v-model="snapshotForm.units" :precision="4" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="基金價格 (USD)" required>
              <el-input-number v-model="snapshotForm.nav" :precision="4" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="匯率 (USD to HKD)" required>
          <el-input-number v-model="snapshotForm.exchange_rate" :precision="4" :step="0.1" style="width: 100%" />
        </el-form-item>

        <div class="preview-box" v-if="snapshotForm.units && snapshotForm.nav">
          預估 HKD 現值：<strong>HK$ {{ computedSnapshotValue.toLocaleString() }}</strong>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="snapshotDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitSnapshot">儲存快照</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const funds = ref([])
const snapshots = ref([])
const loading = ref(false)
const submitting = ref(false)
const fundDialogVisible = ref(false)
const snapshotDialogVisible = ref(false)

const fundForm = ref({ name: '', manual_cost: 0 })
const snapshotForm = ref({
  fund_id: '',
  year_month: new Date().toISOString().slice(0, 7),
  units: 0,
  nav: 0,
  exchange_rate: 7.8
})

const totalCost = computed(() => funds.value.reduce((sum, f) => sum + Number(f.manual_cost), 0))
const totalValue = computed(() => funds.value.reduce((sum, f) => sum + getLatestValue(f), 0))
const totalPnl = computed(() => totalValue.value - totalCost.value)

const getLatestSnapshot = (fund) => {
  const fSnaps = snapshots.value.filter(s => s.fund_id === fund.id)
  if (fSnaps.length === 0) return null
  return fSnaps.sort((a, b) => b.year_month.localeCompare(a.year_month))[0]
}

const getLatestValue = (fund) => {
  const latest = getLatestSnapshot(fund)
  return latest ? Number(latest.total_value_hkd) : 0
}

const getPnl = (fund) => {
  return getLatestValue(fund) - Number(fund.manual_cost)
}

const computedSnapshotValue = computed(() => {
  const v = (snapshotForm.value.units || 0) * (snapshotForm.value.nav || 0) * (snapshotForm.value.exchange_rate || 0)
  return Math.round(v)
})

const fetchData = async () => {
  loading.value = true
  const [fundRes, snapRes] = await Promise.all([
    supabase.from('funds').select('*').order('created_at', { ascending: false }),
    supabase.from('fund_snapshots').select('*')
  ])
  if (!fundRes.error) funds.value = fundRes.data || []
  if (!snapRes.error) snapshots.value = snapRes.data || []
  loading.value = false
}

const openFundDialog = () => {
  fundForm.value = { name: '', manual_cost: 0 }
  fundDialogVisible.value = true
}

const submitFund = async () => {
  if (!fundForm.value.name) return ElMessage.warning('請輸入名稱')
  submitting.value = true
  const { error } = await supabase.from('funds').insert([{
    family_id: '00000000-0000-0000-0000-000000000001',
    name: fundForm.value.name,
    manual_cost: fundForm.value.manual_cost
  }])
  submitting.value = false
  if (error) ElMessage.error('失敗：' + error.message)
  else {
    ElMessage.success('✅ 基金已新增')
    fundDialogVisible.value = false
    fetchData()
  }
}

const openSnapshotDialog = () => {
  if (funds.value.length === 0) return ElMessage.warning('請先新增基金主檔')
  snapshotForm.value = {
    fund_id: funds.value[0].id,
    year_month: new Date().toISOString().slice(0, 7),
    units: 0, nav: 0, exchange_rate: 7.8
  }
  snapshotDialogVisible.value = true
}

const submitSnapshot = async () => {
  if (!snapshotForm.value.fund_id || !snapshotForm.value.year_month) return ElMessage.warning('請填寫完整')
  submitting.value = true
  const { error } = await supabase.from('fund_snapshots').insert([{
    fund_id: snapshotForm.value.fund_id,
    year_month: snapshotForm.value.year_month,
    units: snapshotForm.value.units,
    nav: snapshotForm.value.nav,
    exchange_rate: snapshotForm.value.exchange_rate,
    total_value_hkd: computedSnapshotValue.value
  }])
  submitting.value = false
  if (error) ElMessage.error('失敗：' + error.message)
  else {
    ElMessage.success('✅ 快照已儲存')
    snapshotDialogVisible.value = false
    fetchData()
  }
}

const deleteFund = async (id) => {
  try {
    await ElMessageBox.confirm('刪除基金將一併刪除所有快照，確定嗎？', '警告', { type: 'warning' })
    const { error } = await supabase.from('funds').delete().eq('id', id)
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
.fund-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.page-header h2 { margin: 0; color: #1e293b; }
.header-actions { display: flex; gap: 10px; }

.mb-20 { margin-bottom: 20px; }
.stat-card { border-radius: 8px; background: #f8fafc; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 5px; }
.stat-value { font-size: 20px; font-weight: bold; }
.text-red { color: #ef4444; }
.text-green { color: #10b981; }
.text-blue { color: #3b82f6; }

/* 電腦版：網格排列 */
.fund-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
  gap: 16px; 
}
.fund-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
.card-header h3 { margin: 0; font-size: 16px; color: #0f172a; }

.card-body { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 14px; }
.label { color: #64748b; }
.value { font-weight: 600; }

.pnl-box { display: flex; justify-content: space-between; padding: 10px; border-radius: 6px; font-weight: bold; margin-top: 5px; }
.pnl-positive { background: #ecfdf5; color: #10b981; }
.pnl-negative { background: #fef2f2; color: #ef4444; }

.latest-info { font-size: 12px; color: #94a3b8; margin-top: 5px; text-align: right; }
.preview-box { background: #eff6ff; color: #1d4ed8; padding: 10px; border-radius: 6px; font-size: 14px; text-align: center; }

/* 🚨 手機端優化：橫向滑動 */
@media (max-width: 768px) {
  .header-actions { width: 100%; justify-content: flex-end; margin-top: 10px; }
  
  .fund-grid {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 12px;
    gap: 12px;
  }
  .fund-card {
    flex: 0 0 85%; /* 卡片寬度佔 85%，露出下一張邊緣提示可以滑動 */
    min-width: 280px;
  }
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/FundView.vue
V: 1793808000
W: ai-wa-fs-001
═══ -->