# 家庭入帳 V3 (Family Finance V3)

這是一個專為家庭設計的現代化財務管理系統，取代傳統 Excel 記帳。採用 Vue 3 + Vite 構建，並使用 Supabase 作為後端資料庫，支援 PWA（可安裝至手機主畫面）。

## 🚀 核心功能

- **工作台 (Dashboard)**：一眼掌握總資產、本月淨資產變化、分類佔比與銀行結餘對帳。
- **收支流水 (Cashflow)**：支援表格與看板雙視圖、自訂分類、一鍵匯入固定支出模板。
- **待轉帳表 (Settlement)**：按對象（老公、老婆、工人）分組，快速結算未付款項。
- **保險供款 (Insurance)**：自動平攤年繳保費、計算歷史供款進度、一鍵切換已轉/未轉。
- **基金投資 (Fund)**：關聯保單自動推算成本、記錄每月快照、計算真實盈虧與提款紀錄。
- **年度報表 (Annual Report)**：全年收支與保險供款統計，支援匯出 CSV。
- **系統設定 (Settings)**：動態管理成員、分類、固定支出模板，並包含資料重置功能。

## 🛠️ 技術架構

- **前端**：Vue 3 (Composition API) + Vite + Element Plus
- **後端**：Supabase (PostgreSQL) 
- **部署**：Cloudflare Pages
- **連線方式**：透過 Cloudflare Pages Functions (`functions/api/supabase/[[path]].js`) 進行反向代理，繞過部分網路環境對 `.supabase.co` 的封鎖。

## 📦 本地開發與部署

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
本專案直接將 Supabase 金鑰寫在 `src/config/supabase.js` 中，並使用代理路徑。

### 3. 啟動本地開發
```bash
npm run dev
```

### 4. 部署到 Cloudflare Pages
- 將專案推送到 GitHub。
- 在 Cloudflare Pages 中連結此倉庫。
- 建置指令設定為：`npm run build`
- 輸出目錄設定為：`dist`

## 🗄️ 資料庫結構 (Supabase)

本系統依賴 Supabase 的 PostgreSQL，主要資料表包含：
- `members`：家庭成員
- `expense_categories`：支出分類
- `fixed_expenses`：固定支出模板
- `expenses`：收支紀錄（含對象與分類）
- `incomes`：收入紀錄
- `monthly_balances`：每月銀行結餘對帳
- `insurance_policies`：保單主檔
- `insurance_payments`：保單繳費狀態
- `funds`：基金主檔（含關聯保單與成本）
- `fund_snapshots`：基金每月快照

## 🔒 安全性說明

資料庫已啟用 RLS (Row Level Security) 並允許 `authenticated` 角色讀寫。前端網頁需透過 `admin@fs-app.com` 等虛擬帳號登入後才能存取資料。

## ⚠️ 注意事項

- 若需清空測試資料，請至「系統設定 -> 資料管理」執行重置。
- 系統已啟用 PWA，可在手機瀏覽器中選擇「加到主畫面」以獲得最佳體驗。

/* ═══ EOF ═══
F: AI-WA-FS/README.md
V: 1793811600
W: ai-wa-fs-001
═══ */