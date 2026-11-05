<template>
  <div class="insurance-container">
    <div class="page-header">
      <h2>保險供款表</h2>
      <el-button type="primary">+ 新增保單</el-button>
    </div>

    <el-card class="box-card">
      <el-empty description="目前尚無保單資料，請點擊右上角新增。" />
    </el-card>
  </div>
</template>

<script setup>
// 這裡之後會串接 Supabase 的 insurance_policies 資料表
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  color: #1e293b;
}
</style>
<!-- ═══ EOF ═══
F: AI-WA-FS/src/views/InsuranceView.vue
V: 1793806300
W: ai-wa-fs-001
═══ -->