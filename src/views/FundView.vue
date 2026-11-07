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
    <el-row :gutter="20" class="mb-20">
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
          <div>
            <h3>{{ fund.name }}</h3>
            <div class="linked-policy" v-if="fund.policy_id">
              <el-tag size="small" type="warning">關聯保單：{{ getPolicyName(fund.policy_id) }} ({{ fund.allocation_pct }}%)</el-tag>
            </div>
            <div class="linked-policy" v-else>
              <el-tag size="small" type="info">獨立基金</el-tag>
            </div>
          </div>
          <div class="header-actions-btn">
            <el-button type="primary" text size="small" @click="openFundDialog(fund)">編輯</el-button>
            <el-button type="danger" text size="small" @click="deleteFund(fund.id)">刪除</el-button>
          </div>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <span class="label">推算投入成本</span>
            <span class="value">HK$ {{ getFundCost(fund).toLocaleString() }}</span>
          </div>
          <div class="info-row" v-if="fund.withdrawn_amount > 0">
            <span class="label text-orange">已提取/轉出金額</span>
            <span class="value text-orange">HK$ {{ Number(fund.withdrawn_amount).toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">當前現值</span>
            <span class="value text-blue">HK$ {{ getLatestValue(fund).toLocaleString() }}</span>
          </div>
          
          <div class="pnl-box" :class="getPnl(fund) >= 0 ? 'pnl-positive' : 'pnl-negative'">
            <span>真實盈虧</span>
            <strong>{{ getPnl(fund) >= 0 ? '+' : '' }} HK$ {{ getPnl(fund).toLocaleString() }}</strong>
          </div>
          
          <div class="latest-info" v-if="getLatestSnapshot(fund)">
            最新快照：{{ getLatestSnapshot(fund).year_month }} 
            ({{ getLatestSnapshot(fund).units }} 單位)
          </div>
        </div>

        <!-- 操作按鈕區 -->
        <div class="card-actions">
          <el-button type="primary" link size="small" @click="openHistoryDialog(fund)">查看歷史快照</el-button>
          <el-button type="warning" size="small" plain @click="openWithdrawDialog(fund)">記錄提款/轉出</el-button>
        </div>
      </el-card>
    </div>

    <!-- 新增/編輯基金彈窗 -->
    <el-dialog v-model="fundDialogVisible" :title="isEditFund ? '編輯基金' : '新增基金'" width="90%" max-width="450px">
      <el-form :model="fundForm" label-position="top">
        <el-form-item label="基金名稱" required>
          <el-input v-model="fundForm.name" placeholder="例如：駿利亨德森遠見基金" />
        </el-form-item>
        
        <el-form-item label="是否為基金保險的關聯基金？">
          <el-switch v-model="isLinkedToPolicy" active-text="關聯保單" inactive-text="獨立基金" />
        </el-form-item>

        <template v-if="isLinkedToPolicy">
          <el-form-item label="選擇關聯保單" required>
            <el-select v-model="fundForm.policy_id" style="width: 100%" placeholder="請選擇基金保險保單">
              <el-option v-for="p in fundPolicies" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="分配比例 (%)" required>
            <el-input-number v-model="fundForm.allocation_pct" :min="0" :max="100" style="width: 100%" />
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="手動輸入成本 (HKD)" required>
            <el-input-number v-model="fundForm.manual_cost" :min="0" style="width: 100%" />
          </el-form-item>
        </template>
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
        <el-form-item label="日期" required>
          <el-date-picker v-model="snapshotForm.year_month" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
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
        
        <el-form-item label="保單貨幣價值 (HKD)" required>
          <el-input-number v-model="snapshotForm.total_value_hkd" :precision="2" :step="1" style="width: 100%" placeholder="請輸入 App 顯示的 HKD 現值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="snapshotDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitSnapshot">儲存快照</el-button>
      </template>
    </el-dialog>

    <!-- 記錄提款彈窗 -->
    <el-dialog v-model="withdrawDialogVisible" title="記錄提款/轉出" width="90%" max-width="400px">
      <el-form label-position="top">
        <div class="preview-box" style="margin-bottom: 15px; background: #fffbeb; color: #d97706;">
          <span>將從「{{ currentFund?.name }}」扣除這筆金額。此操作不會影響你原本的投入成本，但會計入真實盈虧。</span>
        </div>
        <el-form-item label="提款/轉出金額 (HKD)" required>
          <el-input-number v-model="withdrawAmount" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitWithdraw">確認記錄</el-button>
      </template>
    </el-dialog>

    <!-- 歷史快照彈窗 -->
    <el-dialog v-model="historyDialogVisible" :title="`歷史快照 - ${currentFund?.name}`" width="90%" max-width="600px">
      <div class="table-wrapper">
        <el-table :data="currentFundSnaps" style="width: 100%; min-width: 500px;" stripe>
          <el-table-column prop="year_month" label="日期" width="120" />
          <el-table-column prop="units" label="單位數" width="100" align="right" />
          <el-table-column prop="nav" label="價格 (USD)" width="100" align="right" />
          <el-table-column prop="total_value_hkd" label="總值 (HKD)" align="right">
            <template #default="scope">
              <span class="font-bold text-blue">HK$ {{ Number(scope.row.total_value_hkd).toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="scope">
              <el-button type="danger" link size="small" @click="deleteSnapshot(scope.row.id)">刪除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-if="currentFundSnaps.length === 0" description="尚無快照紀錄" :image-size="60" />
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
const policies = ref([])
const loading = ref(false)
const submitting = ref(false)

// 彈窗狀態
const fundDialogVisible = ref(false)
const snapshotDialogVisible = ref(false)
const withdrawDialogVisible = ref(false)
const historyDialogVisible = ref(false)

// 表單狀態
const isEditFund = ref(false)
const isLinkedToPolicy = ref(false)
const fundForm = ref({ id: null, name: '', policy_id: '', allocation_pct: 0, manual_cost: 0 })
const snapshotForm = ref({ fund_id: '', year_month: new Date().toISOString().slice(0, 10), units: 0, nav: 0, total_value_hkd: 0 })

// 提款狀態
const currentFund = ref(null)
const withdrawAmount = ref(0)

// 歷史快照狀態
const currentFundSnaps = ref([])

const fundPolicies = computed(() => policies.value.filter(p => p.type === 'fund_insurance'))

const getPolicyName = (policyId) => {
  const p = policies.value.find(x => x.id === policyId)
  return p ? p.name : '未知保單'
}

const getFundCost = (fund) => {
  if (!fund.policy_id) return Number(fund.manual_cost) || 0
  const policy = policies.value.find(p => p.id === fund.policy_id)
  if (!policy) return Number(fund.manual_cost) || 0

  const start = new Date(policy.start_date)
  const now = new Date()
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const paidMonths = Math.max(0, diffMonths + 1)

  const totalPolicyCost = Number(policy.monthly_average) * paidMonths
  const fundCost = totalPolicyCost * (Number(fund.allocation_pct) / 100)
  return Math.round(fundCost)
}

const getPnl = (fund) => {
  const currentVal = getLatestValue(fund)
  const withdrawn = Number(fund.withdrawn_amount) || 0
  const cost = getFundCost(fund)
  return (currentVal + withdrawn) - cost
}

const totalCost = computed(() => funds.value.reduce((sum, f) => sum + getFundCost(f), 0))
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

const fetchData = async () => {
  loading.value = true
  const [fundRes, snapRes, polRes] = await Promise.all([
    supabase.from('funds').select('*').order('created_at', { ascending: false }),
    supabase.from('fund_snapshots').select('*'),
    supabase.from('insurance_policies').select('*').order('created_at', { ascending: false })
  ])
  if (!fundRes.error) funds.value = fundRes.data || []
  if (!snapRes.error) snapshots.value = snapRes.data || []
  if (!polRes.error) policies.value = polRes.data || []
  loading.value = false
}

const openHistoryDialog = (fund) => {
  currentFund.value = fund
  currentFundSnaps.value = snapshots.value
    .filter(s => s.fund_id === fund.id)
    .sort((a, b) => b.year_month.localeCompare(a.year_month))
  historyDialogVisible.value = true
}

const deleteSnapshot = async (id) => {
  try {
    await ElMessageBox.confirm('確定要刪除這筆快照嗎？這將會影響該月的盈虧計算。', '警告', { type: 'warning' })
    const { error } = await supabase.from('fund_snapshots').delete().eq('id', id)
    if (error) throw error
    ElMessage.success('已刪除')
    fetchData()
    currentFundSnaps.value = currentFundSnaps.value.filter(s => s.id !== id)
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗')
  }
}

const openWithdrawDialog = (fund) => {
  currentFund.value = fund
  withdrawAmount.value = 0
  withdrawDialogVisible.value = true
}

const submitWithdraw = async () => {
  if (withdrawAmount.value <= 0) return ElMessage.warning('請輸入大於 0 的金額')
  submitting.value = true
  
  const newWithdrawn = (Number(currentFund.value.withdrawn_amount) || 0) + withdrawAmount.value
  
  const { error } = await supabase.from('funds')
    .update({ withdrawn_amount: newWithdrawn })
    .eq('id', currentFund.value.id)

  submitting.value = false
  if (error) ElMessage.error('記錄失敗：' + error.message)
  else {
    ElMessage.success('✅ 已記錄提款')
    withdrawDialogVisible.value = false
    fetchData()
  }
}

const openFundDialog = (fund = null) => {
  if (fund) {
    isEditFund.value = true
    isLinkedToPolicy.value = !!fund.policy_id
    fundForm.value = {
      id: fund.id,
      name: fund.name,
      policy_id: fund.policy_id || '',
      allocation_pct: Number(fund.allocation_pct) || 0,
      manual_cost: Number(fund.manual_cost) || 0
    }
  } else {
    isEditFund.value = false
    isLinkedToPolicy.value = false
    fundForm.value = { id: null, name: '', policy_id: '', allocation_pct: 0, manual_cost: 0 }
  }
  fundDialogVisible.value = true
}

const submitFund = async () => {
  if (!fundForm.value.name) return ElMessage.warning('請輸入名稱')
  
  let payload = {
    name: fundForm.value.name,
    policy_id: null,
    allocation_pct: 0,
    manual_cost: 0
  }

  if (isLinkedToPolicy.value) {
    if (!fundForm.value.policy_id || fundForm.value.allocation_pct <= 0) return ElMessage.warning('請選擇保單並填寫比例')
    payload.policy_id = fundForm.value.policy_id
    payload.allocation_pct = fundForm.value.allocation_pct
  } else {
    if (fundForm.value.manual_cost <= 0) return ElMessage.warning('請輸入投入成本')
    payload.manual_cost = fundForm.value.manual_cost
  }

  submitting.value = true
  
  let error
  if (isEditFund.value) {
    const res = await supabase.from('funds').update(payload).eq('id', fundForm.value.id)
    error = res.error
  } else {
    const res = await supabase.from('funds').insert([{
      ...payload,
      family_id: '00000000-0000-0000-0000-000000000001'
    }])
    error = res.error
  }

  submitting.value = false
  
  if (error) {
    ElMessage.error('失敗：' + error.message)
  } else {
    ElMessage.success(isEditFund.value ? '✅ 基金已更新' : '✅ 基金已新增')
    fundDialogVisible.value = false
    fetchData()
  }
}

const openSnapshotDialog = () => {
  if (funds.value.length === 0) return ElMessage.warning('請先新增基金主檔')
  snapshotForm.value = {
    fund_id: funds.value[0].id,
    year_month: new Date().toISOString().slice(0, 10),
    units: 0, nav: 0, total_value_hkd: 0
  }
  snapshotDialogVisible.value = true
}

const submitSnapshot = async () => {
  if (!snapshotForm.value.fund_id || !snapshotForm.value.year_month) return ElMessage.warning('請填寫完整')
  if (snapshotForm.value.total_value_hkd <= 0) return ElMessage.warning('請輸入保單貨幣價值 (HKD)')
  
  submitting.value = true
  const { error } = await supabase.from('fund_snapshots').insert([{
    fund_id: snapshotForm.value.fund_id,
    year_month: snapshotForm.value.year_month,
    units: snapshotForm.value.units,
    nav: snapshotForm.value.nav,
    exchange_rate: 1, // 保留欄位但不參與計算，預設給 1
    total_value_hkd: snapshotForm.value.total_value_hkd
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
.text-orange { color: #f59e0b; }
.font-bold { font-weight: 600; }

.fund-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.fund-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
.card-header h3 { margin: 0 0 5px 0; font-size: 16px; color: #0f172a; }
.header-actions-btn { display: flex; align-items: center; }
.linked-policy { font-size: 12px; }

.card-body { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 14px; }
.label { color: #64748b; }
.value { font-weight: 600; }

.pnl-box { display: flex; justify-content: space-between; padding: 10px; border-radius: 6px; font-weight: bold; margin-top: 5px; }
.pnl-positive { background: #ecfdf5; color: #10b981; }
.pnl-negative { background: #fef2f2; color: #ef4444; }

.latest-info { font-size: 12px; color: #94a3b8; margin-top: 5px; text-align: right; }
.preview-box { background: #eff6ff; color: #1d4ed8; padding: 10px 15px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 13px; }

.card-actions { display: flex; justify-content: space-between; margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px; }

.table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 768px) {
  .header-actions { width: 100%; justify-content: flex-end; margin-top: 10px; }
  .fund-grid { display: flex; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 12px; gap: 12px; }
  .fund-card { flex: 0 0 85%; min-width: 280px; }
}
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/FundView.vue
V: 1793991000
W: ai-wa-fs-002
═══ -->