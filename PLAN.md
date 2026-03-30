# Implementation Plan — Restaurant Inventory Management SaaS

> แผนพัฒนาระบบตาม CLAUDE.md แบ่งเป็น 8 Phases พร้อมอ้างอิง Agent Skills

---

## Phase 1: Project Setup & Infrastructure

### Task 1.1 — สร้างโปรเจค Vite + React + TypeScript `[S]`
- สร้าง Vite project พร้อม dependencies ทั้งหมด
- react, react-dom, react-router-dom, @supabase/supabase-js
- tailwindcss, daisyui, lucide-react, react-hot-toast, vite-plugin-pwa
- **ไฟล์:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`
- **Skill:** `bundle-barrel-imports` — ตั้งโครงสร้าง import ที่ไม่ใช้ barrel files ตั้งแต่ต้น

### Task 1.2 — Folder Structure ตาม CLAUDE.md 0.8 `[S]`
- สร้างโครงสร้าง folder ทั้งหมด
- **ต้องมี:** `src/app/routes/`, `src/app/providers/`, `src/features/{auth,inventory,pl,daily-sale,labor,expenses,complaints,report}/`, `src/components/{ui,layout}/`, `src/lib/`, `src/hooks/`

### Task 1.3 — Supabase Client Setup `[S]`
- **ไฟล์:** `src/lib/supabase.ts` (singleton client), `.env.local`, `.env.example`
- **Skill:** `conn-pooling`, `conn-limits`

### Task 1.4 — PWA Configuration `[S]`
- **ไฟล์:** `vite.config.ts` (VitePWA), `public/manifest.webmanifest`, `public/icons/`
- ตาม CLAUDE.md section 5.1

### Task 1.5 — Theme System + Base Layout `[M]`
- Dark/Light mode ด้วย DaisyUI `data-theme`
- Layout: Sidebar (collapsible) + Navbar + Content area
- **ไฟล์:** `ThemeProvider.tsx`, `Sidebar.tsx`, `Navbar.tsx`, `AppLayout.tsx`, `AuthLayout.tsx`, `ThemeToggle.tsx`
- **Skill:** `client-localstorage-schema`, `architecture-compound-components`, Web Design Guidelines

### Task 1.6 — React Router v6 + Code Splitting `[M]`
- Route structure ตาม section 0.9 พร้อม `React.lazy()` ทุก route
- **ไฟล์:** `src/app/routes/index.tsx`, `ProtectedRoute.tsx`, `RoleRoute.tsx`, placeholder pages
- **Skill:** `bundle-dynamic-imports`, `async-suspense-boundaries`

### Task 1.7 — Shared UI Components `[M]`
- DaisyUI-based: Button, Input, Select, Modal, Table, Card, Badge, LoadingSpinner, EmptyState, ConfirmDialog
- **Skill:** `architecture-avoid-boolean-props`, `patterns-explicit-variants`, Web Design Guidelines (a11y)

### Task 1.8 — Toast Notification `[S]`
- **ไฟล์:** `ToastProvider.tsx`, `src/lib/toast.ts`

### Task 1.9 — Date & Currency Utilities `[S]`
- แปลง พ.ศ., format บาท, Thai month names
- **ไฟล์:** `src/lib/date-utils.ts`, `src/lib/currency.ts`, `src/lib/constants.ts`

---

## Phase 2: Database Schema & Migrations

### Task 2.1 — Enum Types + Core Tables `[M]`
- **Enums:** `plan_type`, `tenant_status`, `user_role`, `inventory_category`, `employee_type`, `waste_type`
- **Tables:** `tenants`, `branches`, `users`, `plan_upgrades`
- **ไฟล์:** `supabase/migrations/001_create_enums.sql`, `002_create_core_tables.sql`
- **Skill:** `schema-primary-keys` (uuid), `schema-data-types` (timestamptz), `schema-constraints`, `schema-foreign-key-indexes`

### Task 2.2 — Inventory Tables `[L]`
- **Tables:** `inventory_items`, `inventory_monthly_header`, `opening_stock`, `daily_receiving`, `closing_stock`, `raw_waste`
- **Indexes:** `(branch_id, date)`, `(branch_id, month, year)`, `(item_id, date)`
- **ไฟล์:** `supabase/migrations/003_create_inventory_tables.sql`
- **Skill:** `schema-constraints` (qty >= 0), `query-composite-indexes`

### Task 2.3 — P&L / Daily Sale / Expenses Tables `[L]`
- **Tables:** `sales_channels`, `daily_sales`, `daily_sale_discounts`, `daily_sale_delivery_details`, `sales_targets`, `monthly_expenses`, `expense_custom_labels`
- **ไฟล์:** `supabase/migrations/004_create_pl_tables.sql`
- **Skill:** `schema-data-types` — ใช้ `numeric(12,2)` สำหรับเงิน

### Task 2.4 — Labor & Complaints Tables `[M]`
- **Tables:** `employees`, `monthly_labor`, `complaints`
- **ไฟล์:** `supabase/migrations/005_create_labor_tables.sql`, `006_create_complaints_table.sql`

### Task 2.5 — Seed Data `[S]`
- 7 หมวด inventory, default sales channels, SuperAdmin user
- **ไฟล์:** `007_seed_categories.sql`, `008_seed_channels.sql`, `009_seed_superadmin.sql`

### Task 2.6 — Database Functions `[L]`
- `calculate_inventory_usage()`, `calculate_avg_cost()`, `calculate_par_stock()`
- `calculate_labor_ot()`, `calculate_labor_deduction()`
- `calculate_pl_summary()`, `get_cogs_from_inventory()`
- **ไฟล์:** `supabase/migrations/010_create_functions.sql`

### Task 2.7 — TypeScript Types `[S]`
- **ไฟล์:** `src/types/database.ts` — generate จาก `supabase gen types typescript`

---

## Phase 3: Authentication & Multi-Tenant

### Task 3.1 — Supabase Auth + Provider `[M]`
- Auth context, session management, auth hooks
- Trigger: `auth.users` insert → สร้าง `public.users`
- **ไฟล์:** `AuthProvider.tsx`, `useAuth.ts`, `src/features/auth/api/auth.ts`, `011_auth_trigger.sql`
- **Skill:** `security-rls-basics`

### Task 3.2 — Registration & Login `[L]`
- Signup flow: ชื่อร้าน → เลือก Plan → ข้อมูลติดต่อ → pending
- **ไฟล์:** `RegisterPage.tsx`, `LoginPage.tsx`, `PendingApprovalPage.tsx`, `ForgotPasswordPage.tsx`
- **Skill:** `state-lift-state`, Web Design Guidelines (form validation)

### Task 3.3 — RLS Policies ทุกตาราง `[XL]`
- Helper functions: `get_user_tenant_id()`, `get_user_branch_id()`, `get_user_role()`, `can_access_branch()`
- Policy ทุกตาราง (SELECT/INSERT/UPDATE/DELETE แยก)
- **ไฟล์:** `012_rls_helper_functions.sql`, `013_rls_policies.sql`
- **Skill:** `security-rls-performance` — ใช้ `(select auth.uid())` แทน `auth.uid()` เพื่อ cache

### Task 3.4 — SuperAdmin Dashboard `[L]`
- Approve/Reject/Suspend tenants, tenant list + detail
- **ไฟล์:** `SuperAdminDashboard.tsx`, `TenantManagement.tsx`, `TenantTable.tsx`
- Edge Function: `supabase/functions/approve-tenant/index.ts`
- **Skill:** `data-pagination`

### Task 3.5 — Role-Based Navigation `[M]`
- Sidebar menu ตาม role, route guards ตาม permission matrix (section 0.4)
- **ไฟล์:** `ProtectedRoute.tsx`, `RoleRoute.tsx`, `usePermission.ts`
- **Skill:** `state-context-interface`, `patterns-explicit-variants`

---

## Phase 4: Inventory Module

### Task 4.1 — Inventory Master Table `[L]`
- CRUD items, monthly header (total_sales, selling_days), opening/closing stock
- คำนวณ: usage_qty, usage_amount, avg_daily_usage, avg_cost, usage_per_10000
- แยก 7 หมวด (section 1.1) พร้อม category filter
- **ไฟล์:** `MainTablePage.tsx`, `InventoryTable.tsx`, `InventoryItemForm.tsx`, `MonthlyHeaderForm.tsx`, `OpeningStockForm.tsx`, `ClosingStockForm.tsx`, `CategoryFilter.tsx`
- **API/Hooks:** `inventory.ts`, `useInventory.ts`, `useInventoryCalculations.ts`
- **Utils:** `calculations.ts` — pure functions ทุกสูตร section 1.2
- **Skill:** `client-swr-dedup`, `rerender-memo`, Web Design Guidelines (table scroll mobile)

### Task 4.2 — Daily Receiving `[M]`
- Staff กรอกรายการรับของ: dropdown สินค้า + qty + amount (หลายรายการ/วัน)
- **ไฟล์:** `ReceivingPage.tsx`, `ReceivingForm.tsx`, `ReceivingList.tsx`, `DatePicker.tsx` (พ.ศ.)
- **Skill:** `data-batch-inserts`, `rerender-functional-setstate`, mobile-first

### Task 4.3 — Raw Waste `[M]`
- บันทึก waste แยก trimmed/untrimmed รายวัน
- คำนวณ: total_waste_qty, total_waste_amount (qty × avg_cost)
- **ไฟล์:** `RawWastePage.tsx`, `WasteForm.tsx`, `WasteTable.tsx`
- **Utils:** `waste-calculations.ts`

### Task 4.4 — Par Stock `[L]`
- เป้าขายรายวัน (section 1.5) + คำนวณ par stock (section 1.6)
- Safety stock default = 2%
- **ไฟล์:** `ParStockPage.tsx`, `ParStockTable.tsx`, `SafetyStockConfig.tsx`, `SalesTargetForm.tsx`
- **Skill:** `rerender-derived-state-no-effect`

### Task 4.5 — Inventory Reports `[M]`
- 3 rankings: usage qty, usage amount, purchase qty
- ยอดรวมแต่ละหมวด
- **ไฟล์:** `InventoryReportPage.tsx`, `UsageRankingTable.tsx`, `AmountRankingTable.tsx`, `PurchaseRankingTable.tsx`, `CategorySummary.tsx`
- **Skill:** `js-index-maps`, `rendering-content-visibility`

---

## Phase 5: Daily Sale & Expenses

### Task 5.1 — Sales Channels Config `[S]`
- Tenant กำหนดช่องทางขายเอง (dine_in / delivery platforms)
- **ไฟล์:** `src/features/daily-sale/api/channels.ts`, `ChannelConfig.tsx`

### Task 5.2 — Daily Sale Entry `[XL]`
- กรอกยอดขายแยก channel, ส่วนลด (0111-0113), VAT (0114), เงินสดเกิน/ขาด (0115)
- จำนวนบิล + heads (หน้าร้าน), bills + GP commission (delivery)
- DTD tracking: เป้าสะสม vs ยอดขายสะสม vs ส่วนต่าง
- **ไฟล์:** `DailySalePage.tsx`, `DailySaleForm.tsx`, `SalesByChannel.tsx`, `DiscountSection.tsx`, `DeliveryDetailSection.tsx`, `DailySaleSummary.tsx`, `DTDTracker.tsx`
- **Skill:** `rerender-split-combined-hooks`, `data-upsert`, mobile-first

### Task 5.3 — Other Expenses `[L]`
- Fixed (รายเดือน): ค่าไฟ, น้ำ, เช่า, บัญชี, ผ่อน, เสื่อม
- Variable (รายวัน): น้ำแข็ง, แก๊ส, อื่นๆ
- Custom labels (0412-0415, 0506-0510)
- ค่าเสื่อม = total_depreciation / lease_months
- **ไฟล์:** `ExpensesPage.tsx`, `FixedExpenseForm.tsx`, `VariableExpenseForm.tsx`, `OtherExpenseForm.tsx`, `CustomLabelEditor.tsx`, `DepreciationCalculator.tsx`
- **Skill:** `architecture-compound-components`

---

## Phase 6: Labor Management

### Task 6.1 — Employee Master Data `[M]`
- CRUD พนักงาน แยก tab FT/PT/HQ
- **ไฟล์:** `EmployeeListPage.tsx`, `EmployeeForm.tsx`, `EmployeeTable.tsx`

### Task 6.2 — Monthly Labor (FT) `[L]`
- รายได้: salary, OT (1x/1.5x/3x/custom), service charge, incentive, allowances
- รายหัก: ลาป่วย/ลากิจ/ขาด/สาย, เงินกู้, ภาษี, ประกันสังคม
- สูตร OT: `(salary/30/8) × multiplier × hours`
- สูตรสาย: `(salary/30/8/60) × minutes`
- Net pay = รายได้รวม + รายหักรวม (รายหักเป็นค่าลบ)
- **ไฟล์:** `FTLaborPage.tsx`, `LaborForm.tsx`, `OTCalculator.tsx`, `DeductionCalculator.tsx`, `LaborSummaryTable.tsx`
- **Utils:** `labor-calculations.ts`
- **Skill:** `rerender-derived-state-no-effect`

### Task 6.3 — Monthly Labor (PT + HQ) `[M]`
- Reuse components จาก Task 6.2
- **ไฟล์:** `PTLaborPage.tsx`, `HQLaborPage.tsx`

---

## Phase 7: P&L Report, Dashboard & Complaints

### Task 7.1 — P&L Report `[XL]`
- งบกำไร-ขาดทุนเต็มรูปแบบ ตาม section 2.1
- Revenue (0101-0115) → COGS (0201-0207 จาก Inventory + Expenses) → Labor (0301-0313) → GP
- Controllable (0401-0415) → PAC → Non-controllable (0501-0510) → EBITDA
- Depreciation (0601) → EBIT → Interest + Tax → Net Profit
- 3 columns: amount, %before_discount, %after_discount
- **กฎ:** COGS 0201-0205 + 0409 ดึงจาก Inventory **อัตโนมัติ ห้ามกรอกมือ**
- **ไฟล์:** `PLReportPage.tsx`, `PLReport.tsx`, `RevenueSection.tsx`, `COGSSection.tsx`, `LaborSection.tsx`, `ControllableSection.tsx`, `NonControllableSection.tsx`, `ProfitSummaryRow.tsx`
- **Utils:** `pl-calculations.ts`
- **Skill:** `async-parallel` (fetch data ขนาน), `rerender-memo`, `js-combine-iterations`

### Task 7.2 — Dashboard `[L]`
- KPI: ยอดขายวันนี้/เดือน, COGS %, GP %, top items
- **ไฟล์:** `DashboardPage.tsx`, `KPICard.tsx`, `SalesTrendChart.tsx`, `COGSBreakdown.tsx`, `TopItemsWidget.tsx`
- **Skill:** `async-parallel`, `bundle-dynamic-imports` (lazy load charts)

### Task 7.3 — Cross-Branch Report (Pro Only) `[L]`
- Consolidated P&L, branch comparison
- **ไฟล์:** `CrossBranchReportPage.tsx`, `ConsolidatedPL.tsx`, `BranchComparison.tsx`, `usePlanGuard.ts`
- **Skill:** `data-n-plus-one`

### Task 7.4 — Complaints `[M]`
- CRUD ข้อร้องเรียน + image upload (Supabase Storage) + mark resolved
- **ไฟล์:** `ComplaintsPage.tsx`, `ComplaintForm.tsx`, `ComplaintList.tsx`, `ComplaintDetail.tsx`, `ImageUpload.tsx`

---

## Phase 8: Settings, Polish & Deploy

### Task 8.1 — Branch Management (Pro) `[M]`
- Owner สร้าง/แก้ไข/ปิด branch (สูงสุด 5)
- **ไฟล์:** `BranchSettingsPage.tsx`, `BranchForm.tsx`, `BranchList.tsx`

### Task 8.2 — User/Staff Management `[M]`
- Owner เชิญ Staff, assign branch
- Edge Function: `supabase/functions/invite-user/index.ts`
- **ไฟล์:** `UserSettingsPage.tsx`, `UserForm.tsx`, `UserList.tsx`

### Task 8.3 — Plan Upgrade `[M]`
- Standard → Pro, log plan_upgrades
- **ไฟล์:** `PlanUpgradePage.tsx`, `PlanComparison.tsx`
- Edge Function: `supabase/functions/upgrade-plan/index.ts`

### Task 8.4 — Branch Switcher `[S]`
- Owner เลือก branch ที่จะดู
- **ไฟล์:** `BranchSwitcher.tsx`, `BranchProvider.tsx`, `useBranch.ts`

### Task 8.5 — Responsive Polish `[M]`
- ทุกหน้าใช้ได้บน mobile (sidebar collapse, table scroll, full-width forms)
- **Skill:** Web Design Guidelines ทั้งหมด, `rendering-content-visibility`

### Task 8.6 — Email Notifications `[M]`
- Edge Function: `supabase/functions/send-notification/index.ts`

### Task 8.7 — Deployment `[M]`
- **ไฟล์:** `vercel.json`, Supabase config
- **Skill:** `deploy-to-vercel`

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (DB) → Phase 3 (Auth)
                                      │
                  ┌───────────────────┼──────────────────┐
                  ↓                   ↓                  ↓
            Phase 4 (Inventory) Phase 6 (Labor)   Phase 7.4 (Complaints)
                  │                   │
                  ↓                   ↓
            Phase 5 (Sale/Expenses) ←─┘
                  │
                  ↓
            Phase 7.1-7.3 (P&L, Dashboard, Reports)
                  │
                  ↓
            Phase 8 (Settings, Polish, Deploy)
```

## Complexity Summary

| Size | Tasks | ประมาณ |
|------|-------|--------|
| S | 8 | ~1-2 ชม./task |
| M | 15 | ~3-5 ชม./task |
| L | 9 | ~6-10 ชม./task |
| XL | 3 (RLS, Daily Sale, P&L) | ~10-16 ชม./task |

**รวม: ~200-280 ชั่วโมง (6-8 สัปดาห์ สำหรับ 1 developer)**
