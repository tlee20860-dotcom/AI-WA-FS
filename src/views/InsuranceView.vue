<template>
  <div class="insurance-container">
    <div class="page-header">
      <h2>保險供款表</h2>
      <el-button type="primary" @click="openAddDialog">+ 新增保單</el-button>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="30"><Loading /></el-icon>
    </div>
    
    <el-empty v-else-if="policies.length === 0" description="目前尚無保單資料，請點擊右上角新增。" />

    <div v-else class="policy-grid">
      <el-card v-for="p in policies" :key="p.id" class="policy-card" shadow="hover">
        <div class="card-header">
          <div class="title-area">
            <h3>{{ p.name }}</h3>
            <span class="company">{{ p.company || '未填寫公司' }}</span>
          </div>
          <div class="header-right">
            <el-tag :type="p.type === 'fund_insurance' ? 'warning' : 'primary'" size="small" style="margin-right: 8px;">
              {{ p.type === 'fund_insurance' ? '基金保險' : '普通保險' }}
            </el-tag>
            <!-- 🆕 編輯與刪除按鈕 -->
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
            <span class="label">本期月均</span>
            <span class="value text-blue">HK$ {{ p.monthly_average.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">繳費方式</span>
            <span class="value">{{ p.payment_freq }} (HK$ {{ p.premium_amount.toLocaleString() }})</span>
          </div>
          
          <div class="progress-area">
            <div class="info-row" style="margin-bottom: 4px;">
              <span class="label">供款進度</span>
              <span class="value">{{ getProgress(p).text }}</span>
            </div>
            <el-progress :percentage="getProgress(p).pct" :show-text="false" :stroke-width="6" />
          </div>
        </div>

        <div class="card-footer">
          <div class="status-info">
            <span>本月狀態：</span>
            <el-tag :type="getCurrentPaymentStatus(p.id) === '已轉' ? 'success' : 'info'" size="small">
              {{ getCurrentPaymentStatus(p.id) }}
            </el-tag>
          </div>
          <el-button 
            :type="getCurrentPaymentStatus(p.id) === '已轉' ? 'default' : 'success'" 
            size="small" 
            @click="togglePayment(p.id)"
          >
            {{ getCurrentPaymentStatus(p.id) === '已轉' ? '取消轉帳' : '確認已轉' }}
          </el-button>
        </div>
      </el-card>
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
        <el-row :gutter="10">
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
        <el-row :gutter="10">
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
        <el-form-item label="保單類型" required>
          <el-radio-group v-model="form.type">
            <el-radio label="normal">普通保險</el-radio>
            <el-radio label="fund_insurance">基金保險</el-radio>
          </el-radio-group>
        </el-form-item>
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
import { Loading, InfoFilled, MoreFilled } from '@element-plus/icons-vue'

const policies = ref([])
const payments = ref([]) 
const loading = ref(true)
const dialogVisible = ref(false)
const submitting = ref(false)
const isEdit = ref(false) // 🆕 判斷是否為編輯模式

const currentYearMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const getProgress = (p) => {
  const start = new Date(p.start_date)
  const now = new Date()
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const currentPeriod = Math.max(0, diffMonths + 1)
  const totalPeriods = p.total_years * 12
  const pct = Math.min(100, Math.round((currentPeriod / totalPeriods) * 100))
  return {
    text: `${currentPeriod} / ${totalPeriods} 期 (${pct}%)`,
    pct: pct
  }
}

const getCurrentPaymentStatus = (policyId) => {
  const record = payments.value.find(
    pay => pay.policy_id === policyId && pay.year_month === currentYearMonth.value
  )
  return record ? record.status : '未轉'
}

const togglePayment = async (policyId) => {
  const currentStatus = getCurrentPaymentStatus(policyId)
  const newStatus = currentStatus === '已轉' ? '未轉' : '已轉'
  
  const existing = payments.value.find(
    pay => pay.policy_id === policyId && pay.year_month === currentYearMonth.value
  )

  let error
  if (existing) {
    const res = await supabase.from('insurance_payments').update({ status: newStatus }).eq('id', existing.id)
    error = res.error
  } else {
    const res = await supabase.from('insurance_payments').insert([{
      policy_id: policyId,
      year_month: currentYearMonth.value,
      status: newStatus
    }])
    error = res.error
  }

  if (error) {
    ElMessage.error('狀態更新失敗：' + error.message)
  } else {
    ElMessage.success(`已標記為 ${newStatus}`)
    fetchData() 
  }
}

const form = ref({ id: null, name: '', company: '', start_date: '', total_years: 10, payment_freq: '月繳', premium_amount: 0, type: 'normal' })
const computedMonthlyAverage = computed(() => form.value.payment_freq === '年繳' ? Math.round((form.value.premium_amount || 0) / 12) : (form.value.premium_amount || 0))

const fetchData = async () => {
  loading.value = true
  const [policiesRes, paymentsRes] = await Promise.all([
    supabase.from('insurance_policies').select('*').order('created_at', { ascending: false }),
    supabase.from('insurance_payments').select('*')
  ])

  if (policiesRes.error) ElMessage.error('載入保單失敗')
  else policies.value = policiesRes.data || []

  if (paymentsRes.error) ElMessage.error('載入狀態失敗')
  else payments.value = paymentsRes.data || []

  loading.value = false
}

const openAddDialog = () => {
  isEdit.value = false
  form.value = { id: null, name: '', company: '', start_date: new Date().toISOString().split('T')[0], total_years: 10, payment_freq: '月繳', premium_amount: 0, type: 'normal' }
  dialogVisible.value = true
}

// 🆕 處理下拉選單的指令 (編輯/刪除)
const handleCommand = (command, policy) => {
  if (command === 'edit') {
    isEdit.value = true
    form.value = { ...policy }
    dialogVisible.value = true
  } else if (command === 'delete') {
    deletePolicy(policy.id, policy.name)
  }
}

// 🆕 刪除保單
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

const submitForm = async () => {
  if (!form.value.name || !form.value.start_date || form.value.premium_amount <= 0) return ElMessage.warning('請填寫完整資訊')
  submitting.value = true
  
  const payload = {
    name: form.value.name, 
    company: form.value.company, 
    start_date: form.value.start_date,
    total_years: form.value.total_years, 
    payment_freq: form.value.payment_freq,
    premium_amount: form.value.premium_amount, 
    monthly_average: computedMonthlyAverage.value,
    type: form.value.type
  }

  let error
  if (isEdit.value) {
    // 更新
    const res = await supabase.from('insurance_policies').update(payload).eq('id', form.value.id)
    error = res.error
  } else {
    // 新增
    const res = await supabase.from('insurance_policies').insert([{
      family_id: '00000000-0000-0000-0000-000000000001',
      ...payload
    }])
    error = res.error
  }

  submitting.value = false
  
  if (error) {
    ElMessage.error('儲存失敗：' + error.message)
  } else {
    ElMessage.success(isEdit.value ? '✅ 保單已更新' : '✅ 保單已新增')
    dialogVisible.value = false
    fetchData()
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
/* 樣式保持不變，僅增加 header-right 以對齊按鈕 */
.insurance-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }
.policy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.policy-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
.header-right { display: flex; align-items: center; }
.title-area h3 { margin: 0 0 4px 0; color: #0f172a; font-size: 16px; }
.company { font-size: 12px; color: #64748b; }
.card-body { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 14px; }
.label { color: #64748b; }
.value { font-weight: 600; color: #334155; }
.text-blue { color: #1d4ed8; }
.progress-area { margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0; }
.status-info { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 6px; }
.preview-box { background: #eff6ff; color: #1d4ed8; padding: 10px 15px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 14px; margin-top: 10px; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/InsuranceView.vue
V: 1793809400
W: ai-wa-fs-001
═══ -->