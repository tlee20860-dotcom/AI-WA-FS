<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系統設定</h2>
    </div>

    <el-tabs v-model="activeTab" class="settings-tabs">
      
      <!-- 家庭成員管理 -->
      <el-tab-pane label="家庭成員管理" name="members">
        <div class="tab-content">
          <div class="action-bar">
            <span class="hint">新增後，記帳時的下拉選單會自動更新。</span>
            <el-button type="primary" @click="openMemberDialog()">+ 新增成員</el-button>
          </div>

          <el-table :data="members" style="width: 100%" stripe v-loading="loading">
            <el-table-column prop="name" label="成員名稱" min-width="120" />
            <el-table-column prop="role" label="角色/關係" width="150" />
            <el-table-column label="操作" width="150" align="center">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="openMemberDialog(scope.row)">編輯</el-button>
                <el-button type="danger" link size="small" @click="deleteMember(scope.row.id)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 其他設定分頁預留 -->
      <el-tab-pane label="分類管理 (開發中)" name="categories" disabled>
        <el-empty description="分類管理功能即將推出..." />
      </el-tab-pane>

    </el-tabs>

    <!-- 成員編輯彈窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '編輯成員' : '新增成員'" width="90%" max-width="400px">
      <el-form :model="form" label-position="top">
        <el-form-item label="成員名稱" required>
          <el-input v-model="form.name" placeholder="例如：老公、老婆、工人" />
        </el-form-item>
        <el-form-item label="角色/關係">
          <el-input v-model="form.role" placeholder="例如：家庭成員、員工" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitMember">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('members')
const members = ref([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = ref({ id: null, name: '', role: '' })

const fetchMembers = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: true })
    
  if (error) ElMessage.error('載入成員失敗：' + error.message)
  else members.value = data || []
  loading.value = false
}

const openMemberDialog = (row = null) => {
  if (row) {
    isEdit.value = true
    form.value = { id: row.id, name: row.name, role: row.role || '' }
  } else {
    isEdit.value = false
    form.value = { id: null, name: '', role: '' }
  }
  dialogVisible.value = true
}

const submitMember = async () => {
  if (!form.value.name) return ElMessage.warning('請輸入成員名稱')
  submitting.value = true

  if (isEdit.value) {
    const { error } = await supabase.from('members').update({
      name: form.value.name,
      role: form.value.role
    }).eq('id', form.value.id)
    
    if (error) ElMessage.error('更新失敗：' + error.message)
    else {
      ElMessage.success('✅ 成員已更新')
      dialogVisible.value = false
      fetchMembers()
    }
  } else {
    const { error } = await supabase.from('members').insert([{
      family_id: '00000000-0000-0000-0000-000000000001',
      name: form.value.name,
      role: form.value.role
    }])
    
    if (error) ElMessage.error('新增失敗：' + error.message)
    else {
      ElMessage.success('✅ 成員已新增')
      dialogVisible.value = false
      fetchMembers()
    }
  }
  submitting.value = false
}

const deleteMember = async (id) => {
  try {
    await ElMessageBox.confirm('刪除成員後，該成員的歷史紀錄仍會保留，但無法再選擇此成員。確定嗎？', '警告', { type: 'warning' })
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) throw error
    ElMessage.success('已刪除')
    fetchMembers()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('刪除失敗')
  }
}

onMounted(() => {
  fetchMembers()
})
</script>

<style scoped>
.settings-container { width: 100%; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; color: #1e293b; }

.settings-tabs { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
.tab-content { padding-top: 10px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.hint { font-size: 13px; color: #64748b; }
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/SettingsView.vue
V: 1793808800
W: ai-wa-fs-001
═══ -->