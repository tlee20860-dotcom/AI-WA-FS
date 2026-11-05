<template>
  <div class="insurance-container">
    <div class="page-header">
      <h2>保險供款表</h2>
      <el-button type="primary" @click="openAddDialog">+ 新增保單</el-button>
    </div>

    <!-- 保單列表 -->
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
          <el-tag :type="p.type === 'fund_insurance' ? 'warning' : 'primary'" size="small">
            {{ p.type === 'fund_insurance' ? '基金保險' : '普通保險' }}
          </el-tag>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">本期月均</span>
            <span class="value">HK$ {{ p.monthly_average.toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">繳費方式</span>
            <span class="value">{{ p.payment_freq }} (HK$ {{ p.premium_amount.toLocaleString() }})</span>
          </div>
          <div class="info-row">
            <span class="label">供款年期</span>
            <span class="value">{{ p.total_years }} 年</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增保單彈窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="新增保單"
      width="90%"
      max-width="500px"
      :close-on-click-modal="false"
    >
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
              <el-date-picker v-model="form.start_date" type="date" placeholder="選擇日期" style="width: 100%" value-format="YYYY-MM-DD" />
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

        <!-- 自動平攤預覽 -->
        <div v-if="form.premium_amount > 0" class="preview-box">
          <el-icon><InfoFilled /></el-icon>
          <span>
            系統將自動平攤：每月約 
            <strong>HK$ {{ computedMonthlyAverage.toLocaleString() }}</strong>
          </span>
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
import { ElMessage } from 'element-plus'
import { Loading, InfoFilled } from '@element-plus/icons-vue'

const policies = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const submitting = ref(false)

// 預設表單
const form = ref({
  name: '',
  company: '',
  start_date: new Date().toISOString().split('T')[0],
  total_years: 10,
  payment_freq: '月繳',
  premium_amount: 0,
  type: 'normal'
})

// 自動計算平攤後的月均金額
const computedMonthlyAverage = computed(() => {
  const amt = form.value.premium_amount || 0
  if (form.value.payment_freq === '年繳') {
    return Math.round(amt / 12)
  }
  return amt
})

// 獲取保單列表
const fetchPolicies = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    ElMessage.error('載入保單失敗：' + error.message)
  } else {
    policies.value = data || []
  }
  loading.value = false
}

// 打開新增彈窗
const openAddDialog = () => {
  form.value = {
    name: '',
    company: '',
    start_date: new Date().toISOString().split('T')[0],
    total_years: 10,
    payment_freq: '月繳',
    premium_amount: 0,
    type: 'normal'
  }
  dialogVisible.value = true
}

// 提交表單
const submitForm = async () => {
  if (!form.value.name || !form.value.start_date || form.value.premium_amount <= 0) {
    ElMessage.warning('請填寫完整資訊')
    return
  }

  submitting.value = true
  
  // 這裡寫死家庭 ID 為預設的 '00000000-0000-0000-0000-000000000001'
  const familyId = '00000000-0000-0000-0000-000000000001'

  const { error } = await supabase.from('insurance_policies').insert([
    {
      family_id: familyId,
      name: form.value.name,
      company: form.value.company,
      start_date: form.value.start_date,
      total_years: form.value.total_years,
      payment_freq: form.value.payment_freq,
      premium_amount: form.value.premium_amount,
      monthly_average: computedMonthlyAverage.value,
      type: form.value.type
    }
  ])

  submitting.value = false

  if (error) {
    ElMessage.error('儲存失敗：' + error.message)
  } else {
    ElMessage.success('✅ 保單已新增')
    dialogVisible.value = false
    fetchPolicies() // 重新載入列表
  }
}

onMounted(() => {
  fetchPolicies()
})
</script>

<style scoped>
.insurance-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }

/* 列表樣式 */
.policy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.policy-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
.title-area h3 { margin: 0 0 4px 0; color: #0f172a; font-size: 16px; }
.company { font-size: 12px; color: #64748b; }
.card-body { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 14px; }
.label { color: #64748b; }
.value { font-weight: 600; color: #334155; }

/* 彈窗預覽框 */
.preview-box { background: #eff6ff; color: #1d4ed8; padding: 10px 15px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 14px; margin-top: 10px; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/InsuranceView.vue
V: 1793806800
W: ai-wa-fs-001
═══ -->