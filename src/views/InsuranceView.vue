<template>
  <div class="insurance-container">
    <div class="page-header">
      <h2>保險供款表</h2>
      <el-button type="primary" @click="openAddDialog">+ 新增保單</el-button>
    </div>

    <!-- 本月總供款額統計 -->
    <el-row :gutter="20" class="mb-24">
      <el-col :span="24">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon"><el-icon><Money /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本月保單總供款額 ({{ currentYearMonth }})</div>
              <div class="stat-value text-blue">HK$ {{ monthlyTotal.toLocaleString() }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>
    
    <el-empty v-else-if="policies.length === 0" description="目前尚無保單資料，請點擊右上角新增。" />

    <div v-else>
      <!-- 供款中保單 -->
      <h3 class="section-title" v-if="activePolicies.length > 0">供款中保單</h3>
      <div class="policy-grid">
        <el-card v-for="p in activePolicies" :key="p.id" class="policy-card" shadow="hover">
          <div class="card-header">
            <div class="title-area">
              <h3>{{ p.name }}</h3>
              <span class="company">{{ p.company || '未填寫公司' }}</span>
            </div>
            <div class="header-right">
              <el-tag :type="p.type === 'fund_insurance' ? 'warning' : 'primary'" size="small" style="margin-right: 8px;">
                {{ p.type === 'fund_insurance' ? '基金保險' : '普通保險' }}
              </el-tag>
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, p)">
                <el-button text size="small"><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">編輯保單</el-dropdown-item>
                    <el-dropdown-item command="delete" style="color: #ef4444;">刪除保單</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">持有人</span>
              <span class="value">{{ p.holder_name || '家庭共用' }}</span>
            </div>
            <div class="info-row">
              <span class="label">本期月均</span>
              <span class="value text-blue">HK$ {{ p.monthly_average.toLocaleString() }}</span>
            </div>
            <div class="info-row">
              <span class="label">繳費方式</span>
              <span class="value">{{ p.payment_freq }} (HK$ {{ p.premium_amount.toLocaleString() }})</span>
            </div>
            
            <div class="progress-area">
              <div class="info-row" style="margin-bottom: 6px;">
                <span class="label">供款進度</span>
                <span class="value">{{ getProgress(p).text }}</span>
              </div>
              <el-progress 
                :percentage="getProgress(p).pct" 
                :show-text="false" 
                :stroke-width="8"
                color="#6366F1"
              />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 已供滿保單 -->
      <div v-if="completedPolicies.length > 0" class="completed-section">
        <h3 class="section-title mt-24">✅ 已供滿保單</h3>
        <div class="policy-grid">
          <el-card v-for="p in completedPolicies" :key="p.id" class="policy-card completed-card" shadow="never">
            <div class="card-header">
              <div class="title-area">
                <h3>{{ p.name }} <el-tag type="success" size="small" effect="dark" class="ml-2">已供滿</el-tag></h3>
                <span class="company">{{ p.company || '未填寫公司' }}</span>
              </div>
              <div class="header-right">
                <el-tag :type="p.type === 'fund_insurance' ? 'warning' : 'primary'" size="small" style="margin-right: 8px;">
                  {{ p.type === 'fund_insurance' ? '基金保險' : '普通保險' }}
                </el-tag>
                <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, p)">
                  <el-button text size="small"><el-icon><MoreFilled /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">編輯保單</el-dropdown-item>
                      <el-dropdown-item command="delete" style="color: #ef4444;">刪除保單</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>

            <div class="card-body text-muted">
              <div class="info-row">
                <span class="label">持有人</span>
                <span class="value">{{ p.holder_name || '家庭共用' }}</span>
              </div>
              <div class="info-row">
                <span class="label">原月均</span>
                <span class="value">HK$ {{ p.monthly_average.toLocaleString() }}</span>
              </div>
              <div class="info-row">
                <span class="label">總期數</span>
                <span class="value">{{ p.total_years * 12 }} 期</span>
              </div>
              
              <div class="progress-area">
                <div class="info-row" style="margin-bottom: 6px;">
                  <span class="label">供款進度</span>
                  <span class="value">{{ getProgress(p).text }}</span>
                </div>
                <el-progress 
                  :percentage="100" 
                  :show-text="false" 
                  :stroke-width="8"
                  color="#10B981"
                />
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 新增/編輯保單彈窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '編輯保單' : '新增保單'" width="90%" max-width="500px" :close-on-click-modal="false">
      <el-form :model="form" label-position="top">
        <el-form-item label="保單名稱" required>
          <el-input v-model="form.name" placeholder="例如：宏利儲蓄保險" />
        </el-form-item>
        <el-form-item label="保險公司">
          <el-input v-model="form.company" placeholder="例如：宏利" />
        </el-form-item>
        
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="持有人" required>
              <el-select v-model="form.holder_name" style="width: 100%" placeholder="請選擇">
                <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保單類型" required>
              <el-radio-group v-model="form.type">
                <el-radio label="normal">普通保險</el-radio>
                <el-radio label="fund_insurance">基金保險</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="開始日期" required>
              <el-date-picker v-model="form.start_date" type="date" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供款年期 (年)" required>
              <el-input-number v-model="form.total_years" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="繳費頻率" required>
              <el-select v-model="form.payment_freq" style="width: 100%">
                <el-option label="月繳" value="月繳" />
                <el-option label="年繳" value="年繳" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="`繳費金額 (${form.payment_freq})`" required>
              <el-input-number v-model="form.premium_amount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <div v-if="form.premium_amount > 0" class="preview-box">
          <el-icon><InfoFilled /></el-icon>
          <span>系統將自動平攤：每月約 <strong>HK$ {{ computedMonthlyAverage.toLocaleString() }}</strong></span>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">確認儲存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, InfoFilled, MoreFilled, Money } from '@element-plus/icons-vue'

const policies = ref([])
const payments = ref([]) 
const members = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const submitting = ref(false)
const isEdit = ref(false)

const currentYearMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

// 本月總供款額 (排除已供滿保單)
const monthlyTotal = computed(() => {
  return activePolicies.value.reduce((sum, p) => sum + Number(p.monthly_average), 0)
})

// 計算進度：已轉筆數 / 總期數
const getProgress = (p) => {
  const policyPayments = payments.value.filter(pay => pay.policy_id === p.id)
  const paidCount = policyPayments.filter(pay => pay.status === '已轉').length
  const totalPeriods = p.total_years * 12
  const pct = totalPeriods > 0 ? Math.min(100, Math.round((paidCount / totalPeriods) * 100)) : 0
  return {
    text: `${paidCount} / ${totalPeriods} 期 (${pct}%)`,
    pct: pct
  }
}

// 🆕 分類保單：供款中 / 已供滿
const activePolicies = computed(() => {
  return policies.value.filter(p => {
    const progress = getProgress(p)
    return progress.pct < 100
  })
})

const completedPolicies = computed(() => {
  return policies.value.filter(p => {
    const progress = getProgress(p)
    return progress.pct >= 100
  })
})

const form = ref({ id: null, name: '', company: '', holder_name: '', start_date: '', total_years: 10, payment_freq: '月繳', premium_amount: 0, type: 'normal' })
const computedMonthlyAverage = computed(() => form.value.payment_freq === '年繳' ? Math.round((form.value.premium_amount || 0) / 12) : (form.value.premium_amount || 0))

const fetchData = async () => {
  loading.value = true
  const [policiesRes, paymentsRes, membersRes] = await Promise.all([
    supabase.from('insurance_policies').select('*').order('created_at', { ascending: false }),
    supabase.from('insurance_payments').select('*'),
    supabase.from('members').select('*').order('created_at', { ascending: true })
  ])

  if (policiesRes.error) ElMessage.error('載入保單失敗')
  else policies.value = policiesRes.data || []

  if (paymentsRes.error) ElMessage.error('載入狀態失敗')
  else payments.value = paymentsRes.data || []

  if (!membersRes.error && membersRes.data) {
    members.value = membersRes.data
  }

  loading.value = false
}

const openAddDialog = () => {
  isEdit.value = false
  const defaultHolder = members.value.length > 0 ? members.value[0].name : ''
  form.value = { id: null, name: '', company: '', holder_name: defaultHolder, start_date: new Date().toISOString().split('T')[0], total_years: 10, payment_freq: '月繳', premium_amount: 0, type: 'normal' }
  dialogVisible.value = true
}

const handleCommand = (command, policy) => {
  if (command === 'edit') {
    isEdit.value = true
    form.value = { ...policy }
    dialogVisible.value = true
  } else if (command === 'delete') {
    deletePolicy(policy.id, policy.name)
  }
}

const deletePolicy = async (id, name) => {
  try {
    await ElMessageBox.confirm(`刪除保單「${name}」將會一併刪除其所有繳費紀錄，確定嗎？`, '警告', { type: 'warning', confirmButtonText: '確定刪除', cancelButtonText: '取消' })
    const { error } = await supabase.from('insurance_policies').delete().eq('id', id)
    if (error) throw error
    ElMessage.success('保單已刪除')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗：' + (err.message || '未知錯誤'))
  }
}

// 自動比對並補齊歷史繳費紀錄 (加入總期數上限)
const syncInsurancePayments = async (policy) => {
  if (!policy || !policy.start_date) return
  
  try {
    const start = new Date(policy.start_date)
    const now = new Date()
    
    // 收集需要的年月
    const requiredMonths = []
    let current = new Date(start.getFullYear(), start.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    const maxPeriods = policy.total_years * 12
    
    while (current <= end) {
      if (requiredMonths.length >= maxPeriods) break // 🆕 達到總期數即停止生成
      
      const yyyy = current.getFullYear()
      const mm = String(current.getMonth() + 1).padStart(2, '0')
      requiredMonths.push(`${yyyy}-${mm}`)
      current.setMonth(current.getMonth() + 1)
    }

    if (requiredMonths.length === 0) return

    // 查詢現有紀錄
    const { data: existingData, error: fetchErr } = await supabase
      .from('insurance_payments')
      .select('year_month')
      .eq('policy_id', policy.id)

    if (fetchErr) throw fetchErr

    const existingMonths = new Set((existingData || []).map(d => d.year_month))
    
    // 比對缺失的月份
    const missingMonths = requiredMonths.filter(m => !existingMonths.has(m))

    if (missingMonths.length > 0) {
      const toInsert = missingMonths.map(ym => ({
        policy_id: policy.id,
        year_month: ym,
        status: '未轉'
      }))
      
      const { error: insErr } = await supabase.from('insurance_payments').insert(toInsert)
      if (insErr) throw insErr
    }
  } catch (err) {
    console.error('同步歷史繳費紀錄失敗', err)
  }
}

const submitForm = async () => {
  if (!form.value.name || !form.value.start_date || form.value.premium_amount <= 0) return ElMessage.warning('請填寫完整資訊')
  if (!form.value.holder_name) return ElMessage.warning('請選擇持有人')
  
  submitting.value = true
  
  const payload = {
    name: form.value.name, 
    company: form.value.company, 
    holder_name: form.value.holder_name,
    start_date: form.value.start_date,
    total_years: form.value.total_years, 
    payment_freq: form.value.payment_freq,
    premium_amount: form.value.premium_amount, 
    monthly_average: computedMonthlyAverage.value,
    type: form.value.type
  }

  if (isEdit.value) {
    // 更新
    const { error } = await supabase.from('insurance_policies').update(payload).eq('id', form.value.id)
    if (error) {
      ElMessage.error('更新失敗：' + error.message)
    } else {
      await syncInsurancePayments({ id: form.value.id, start_date: form.value.start_date, total_years: form.value.total_years })
      ElMessage.success('✅ 保單已更新')
      dialogVisible.value = false
      fetchData()
    }
  } else {
    // 新增保單
    const familyId = '00000000-0000-0000-0000-000000000001'
    const { data: newPolicy, error } = await supabase.from('insurance_policies').insert([{
      family_id: familyId,
      ...payload
    }]).select().single()

    if (error) {
      ElMessage.error('新增失敗：' + error.message)
    } else {
      await syncInsurancePayments(newPolicy)
      ElMessage.success('✅ 保單已新增，並已生成歷史待辦')
      dialogVisible.value = false
      fetchData()
    }
  }
  submitting.value = false
}

onMounted(() => fetchData())
</script>

<style scoped>
.insurance-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 700; }

.mb-24 { margin-bottom: 24px; }
.mt-24 { margin-top: 32px; margin-bottom: 16px; }
.section-title { color: #1e293b; font-size: 18px; font-weight: 700; margin-bottom: 16px; }

/* 統計卡片 */
.stat-card { border-radius: 20px; border: none; background: #ffffff; }
.stat-content { display: flex; align-items: center; padding: 8px; }
.stat-icon { width: 56px; height: 56px; border-radius: 16px; background: #EFF6FF; color: #3B82F6; display: flex; justify-content: center; align-items: center; font-size: 28px; margin-right: 20px; }
.stat-label { font-size: 14px; color: #64748b; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: bold; }
.text-blue { color: #3B82F6; }

/* 保單列表網格 */
.policy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.policy-card { border-radius: 20px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }
.policy-card.completed-card { background-color: #F8FAFC; box-shadow: none; opacity: 0.8; }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
.header-right { display: flex; align-items: center; }
.title-area h3 { margin: 0 0 6px 0; color: #1e293b; font-size: 18px; font-weight: 700; }
.company { font-size: 13px; color: #64748b; }
.card-body { display: flex; flex-direction: column; gap: 10px; }
.card-body.text-muted .label, .card-body.text-muted .value { color: #94a3b8; }
.info-row { display: flex; justify-content: space-between; font-size: 14px; }
.label { color: #64748b; }
.value { font-weight: 600; color: #334155; }
.progress-area { margin-top: 12px; background: #ffffff; padding: 12px 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
.completed-card .progress-area { background: #F1F5F9; border: none; }
.preview-box { background: #EEF2FF; color: #6366F1; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 14px; margin-top: 12px; }

.ml-2 { margin-left: 8px; }
</style>

<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/InsuranceView.vue
V: 1794003000
W: ai-wa-fs-002
═══ -->